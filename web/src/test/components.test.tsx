import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./utils";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";

describe("DataTable Component", () => {
  const columns = [
    { key: "name", header: "Name", render: (item: any) => item.name },
    { key: "code", header: "Code", render: (item: any) => item.code },
  ];

  const data = [
    { id: "1", name: "Station 1", code: "S1" },
    { id: "2", name: "Station 2", code: "S2" },
  ];

  it("renders table with data", () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText("Station 1")).toBeInTheDocument();
    expect(screen.getByText("Station 2")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No stations" />);

    expect(screen.getByText("No stations")).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    const { container } = render(<DataTable columns={columns} data={[]} isLoading />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("calls onRowClick when row clicked", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);

    fireEvent.click(screen.getByText("Station 1"));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });
});

describe("ConfirmDialog Component", () => {
  it("renders when open", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls onConfirm when delete clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Confirm?"
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it("shows loading state", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Confirm?"
        onConfirm={() => {}}
        isLoading={true}
      />
    );

    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });
});
