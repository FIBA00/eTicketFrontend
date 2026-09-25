import { useState } from "react";
import { Calendar, Download, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDailyAudit,
  useGenerateAudit,
  useAuditHistory,
  useCommission,
  useWithdrawalHistory,
  useRequestWithdrawal,
  useRevenueReport,
  getWeekStart,
  getWeekEnd,
  type DailyAudit,
} from "@/hooks/use-finance";
import { useAuth } from "@/hooks/use-auth";
import { formatCents } from "@/lib/money-utils";

export default function RevenuePage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("SYSTEM_ADMIN", "STATION_CONTROLLER");
  const isTicketer = hasRole("TICKETER");

  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);
  const [revenueStart, setRevenueStart] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [revenueEnd, setRevenueEnd] = useState(new Date().toISOString().split("T")[0]);

  // Data fetching
  const { data: todayAudit, refetch: refetchAudit } = useDailyAudit(auditDate);
  const generateAudit = useGenerateAudit();
  const { data: auditHistory } = useAuditHistory(30);
  const { data: commission } = useCommission();
  const { data: withdrawals } = useWithdrawalHistory();
  const requestWithdrawal = useRequestWithdrawal();
  const { data: revenue } = useRevenueReport(revenueStart, revenueEnd);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  async function handleGenerateAudit() {
    try {
      await generateAudit.mutateAsync(auditDate);
      refetchAudit();
    } catch (err) {
      console.error("Audit generation failed:", err);
    }
  }

  async function handleWithdraw() {
    setWithdrawError("");
    setWithdrawSuccess("");

    const amountCents = Math.round(parseFloat(withdrawAmount) * 100);
    if (!amountCents || amountCents <= 0) {
      setWithdrawError("Enter a valid amount");
      return;
    }

    if (!commission || amountCents > commission.availableCents) {
      setWithdrawError("Amount exceeds available balance");
      return;
    }

    try {
      await requestWithdrawal.mutateAsync({
        amountCents,
        weekStartDate: getWeekStart(),
      });
      setWithdrawSuccess("Withdrawal requested successfully");
      setWithdrawAmount("");
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">
            Revenue, audits, and commission management
          </p>
        </div>
      </div>

      <Tabs defaultValue={isTicketer ? "commission" : "overview"} className="space-y-4">
        <TabsList>
          {isAdmin && <TabsTrigger value="overview">Overview</TabsTrigger>}
          {isAdmin && <TabsTrigger value="audits">Daily Audits</TabsTrigger>}
          {isTicketer && <TabsTrigger value="commission">My Commission</TabsTrigger>}
          {isAdmin && <TabsTrigger value="revenue">Revenue Report</TabsTrigger>}
        </TabsList>

        {/* Overview Tab (Admin) */}
        {isAdmin && (
          <TabsContent value="overview" className="space-y-4">
            {/* Today's Audit */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daily Audit</CardTitle>
                    <CardDescription>Generate or view daily summary</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={auditDate}
                      onChange={(e) => setAuditDate(e.target.value)}
                      className="w-40"
                    />
                    <Button
                      onClick={handleGenerateAudit}
                      disabled={generateAudit.isPending}
                    >
                      {generateAudit.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {todayAudit ? (
                  <AuditSummary audit={todayAudit} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No audit generated for this date. Click Generate to create one.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Total Tickets"
                value={todayAudit?.totalTickets?.toString() ?? "—"}
                icon={<Calendar className="h-4 w-4" />}
              />
              <StatCard
                title="Total Revenue"
                value={todayAudit ? `${formatCents(todayAudit.totalRevenueCents)} ETB` : "—"}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                title="Net Revenue"
                value={todayAudit ? `${formatCents(todayAudit.netRevenueCents)} ETB` : "—"}
                icon={<Wallet className="h-4 w-4" />}
              />
              <StatCard
                title="Commission Paid"
                value={todayAudit ? `${formatCents(todayAudit.totalCommissionCents)} ETB` : "—"}
                icon={<Download className="h-4 w-4" />}
              />
            </div>
          </TabsContent>
        )}

        {/* Audits Tab (Admin) */}
        {isAdmin && (
          <TabsContent value="audits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit History</CardTitle>
                <CardDescription>Previous daily audits</CardDescription>
              </CardHeader>
              <CardContent>
                {auditHistory && auditHistory.length > 0 ? (
                  <div className="space-y-4">
                    {auditHistory.map((audit) => (
                      <div
                        key={audit.date}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">
                            {new Date(audit.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {audit.totalTickets} tickets
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium">
                            {formatCents(audit.totalRevenueCents)} ETB
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Net: {formatCents(audit.netRevenueCents)} ETB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No audits yet. Generate your first daily audit.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Commission Tab (Ticketer) */}
        {isTicketer && (
          <TabsContent value="commission" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Commission (This Week)</CardDescription>
                  <CardTitle className="text-2xl">
                    {commission ? formatCents(commission.totalCommissionCents) : "0.00"} ETB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {commission?.ticketCount ?? 0} tickets issued
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Already Withdrawn</CardDescription>
                  <CardTitle className="text-2xl">
                    {commission ? formatCents(commission.alreadyWithdrawnCents) : "0.00"} ETB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">This week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Available to Withdraw</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    {commission ? formatCents(commission.availableCents) : "0.00"} ETB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Week of {getWeekStart()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Withdrawal Form */}
            <Card>
              <CardHeader>
                <CardTitle>Request Withdrawal</CardTitle>
                <CardDescription>
                  Withdraw your commission. Processed weekly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="amount">Amount (ETB)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleWithdraw}
                      disabled={requestWithdrawal.isPending || !commission?.availableCents}
                    >
                      {requestWithdrawal.isPending ? "Requesting..." : "Request Withdrawal"}
                    </Button>
                  </div>
                </div>

                {withdrawError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {withdrawError}
                  </div>
                )}
                {withdrawSuccess && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                    {withdrawSuccess}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawals && withdrawals.length > 0 ? (
                  <div className="space-y-2">
                    {withdrawals.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {formatCents(w.amountCents)} ETB
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Week of {new Date(w.weekStartDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            w.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : w.status === "APPROVED"
                              ? "bg-blue-100 text-blue-700"
                              : w.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No withdrawal requests yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Revenue Report Tab (Admin) */}
        {isAdmin && (
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue Report</CardTitle>
                    <CardDescription>Station revenue over time</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={revenueStart}
                      onChange={(e) => setRevenueStart(e.target.value)}
                      className="w-40"
                    />
                    <span>to</span>
                    <Input
                      type="date"
                      value={revenueEnd}
                      onChange={(e) => setRevenueEnd(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {revenue ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          {formatCents(revenue.totalRevenueCents)} ETB
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Net Revenue</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCents(revenue.netRevenueCents)} ETB
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Total Tickets</p>
                        <p className="text-2xl font-bold">{revenue.totalTickets}</p>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Daily Breakdown</h4>
                      {revenue.dailyBreakdown.map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between rounded border p-3 text-sm"
                        >
                          <span>{new Date(day.date).toLocaleDateString()}</span>
                          <span>{day.tickets} tickets</span>
                          <span className="font-mono">
                            {formatCents(day.revenueCents)} ETB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Loading revenue data...
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────

function AuditSummary({ audit }: { audit: DailyAudit }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Fare Total</span>
            <span className="font-mono">{formatCents(audit.totalFareCents)} ETB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Charges</span>
            <span className="font-mono">{formatCents(audit.totalServiceChargeCents)} ETB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT Collected</span>
            <span className="font-mono">{formatCents(audit.totalVatCents)} ETB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Station Fees</span>
            <span className="font-mono">{formatCents(audit.totalStationFeeCents)} ETB</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Collected</span>
            <span className="font-mono font-medium">
              {formatCents(audit.totalRevenueCents)} ETB
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commission Paid</span>
            <span className="font-mono">{formatCents(audit.totalCommissionCents)} ETB</span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Net Revenue</span>
            <span className="font-mono text-green-600">
              {formatCents(audit.netRevenueCents)} ETB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
