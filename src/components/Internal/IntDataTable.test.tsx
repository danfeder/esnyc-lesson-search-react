import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntDataTable, type IntDataTableColumn } from './IntDataTable';

type Row = { id: string; name: string; count: number };

const baseRows: Row[] = [
  { id: 'a', name: 'Alpha', count: 1 },
  { id: 'b', name: 'Beta', count: 2 },
  { id: 'c', name: 'Gamma', count: 3 },
];

const baseColumns: IntDataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name },
  { key: 'count', header: 'Count', render: (r) => r.count, numeric: true },
];

describe('IntDataTable', () => {
  describe('rendering', () => {
    it('renders rows + columns', () => {
      render(<IntDataTable columns={baseColumns} rows={baseRows} getRowKey={(r) => r.id} />);
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('shows empty message when rows is empty', () => {
      render(
        <IntDataTable
          columns={baseColumns}
          rows={[]}
          getRowKey={(r) => r.id}
          emptyMessage="Nothing here yet"
        />
      );
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    });

    it('passes ariaLabel to the table', () => {
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          ariaLabel="Test users"
        />
      );
      expect(screen.getByRole('table', { name: 'Test users' })).toBeInTheDocument();
    });

    it('applies density attribute to wrapper', () => {
      const { container } = render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          density="compact"
        />
      );
      expect(container.querySelector('[data-density="compact"]')).toBeInTheDocument();
    });
  });

  describe('row interaction', () => {
    it('fires onRowClick when a row is clicked', () => {
      const onRowClick = vi.fn();
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          onRowClick={onRowClick}
        />
      );
      fireEvent.click(screen.getByText('Beta'));
      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith(baseRows[1]);
    });

    it('activates row via Enter key when onRowClick is wired', () => {
      const onRowClick = vi.fn();
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          onRowClick={onRowClick}
        />
      );
      const row = screen.getByText('Alpha').closest('tr')!;
      fireEvent.keyDown(row, { key: 'Enter' });
      expect(onRowClick).toHaveBeenCalledWith(baseRows[0]);
    });

    it('activates row via Space key when onRowClick is wired', () => {
      const onRowClick = vi.fn();
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          onRowClick={onRowClick}
        />
      );
      const row = screen.getByText('Alpha').closest('tr')!;
      fireEvent.keyDown(row, { key: ' ' });
      expect(onRowClick).toHaveBeenCalled();
    });

    it('does NOT make rows interactive when onRowClick is omitted', () => {
      render(<IntDataTable columns={baseColumns} rows={baseRows} getRowKey={(r) => r.id} />);
      const row = screen.getByText('Alpha').closest('tr')!;
      expect(row).not.toHaveAttribute('tabindex');
    });
  });

  describe('selection', () => {
    it('renders the master + per-row checkboxes when selectable', () => {
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={[]}
          onSelectionChange={vi.fn()}
        />
      );
      // 1 master + 3 per-row = 4 checkboxes
      expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    });

    it('toggles a single row on/off', () => {
      const onSelectionChange = vi.fn();
      const { rerender } = render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={[]}
          onSelectionChange={onSelectionChange}
        />
      );
      fireEvent.click(screen.getByLabelText('Select row b'));
      expect(onSelectionChange).toHaveBeenLastCalledWith(['b']);

      rerender(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={['b']}
          onSelectionChange={onSelectionChange}
        />
      );
      fireEvent.click(screen.getByLabelText('Select row b'));
      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it('master checkbox is indeterminate when only some rows are selected', () => {
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={['a']}
          onSelectionChange={vi.fn()}
        />
      );
      const master = screen.getByLabelText('Select all rows') as HTMLInputElement;
      expect(master.indeterminate).toBe(true);
      expect(master.checked).toBe(false);
    });

    it('master checkbox is checked when every visible row is selected', () => {
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={['a', 'b', 'c']}
          onSelectionChange={vi.fn()}
        />
      );
      const master = screen.getByLabelText('Select all rows') as HTMLInputElement;
      expect(master.checked).toBe(true);
      expect(master.indeterminate).toBe(false);
    });

    it('toggleAll adds visible rows without overwriting off-page selections', () => {
      const onSelectionChange = vi.fn();
      // 'z' is an off-page selection; toggling all on this page should preserve it
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={['z']}
          onSelectionChange={onSelectionChange}
        />
      );
      fireEvent.click(screen.getByLabelText('Select all rows'));
      const next = onSelectionChange.mock.calls[0][0] as string[];
      expect(next).toEqual(expect.arrayContaining(['z', 'a', 'b', 'c']));
      expect(next).toHaveLength(4);
    });

    it('toggleAll-off only removes visible rows, keeping off-page selections', () => {
      const onSelectionChange = vi.fn();
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={['a', 'b', 'c', 'z']}
          onSelectionChange={onSelectionChange}
        />
      );
      fireEvent.click(screen.getByLabelText('Select all rows'));
      expect(onSelectionChange).toHaveBeenLastCalledWith(['z']);
    });

    it('uses getSelectRowLabel for custom checkbox accessible names', () => {
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={[]}
          onSelectionChange={vi.fn()}
          getSelectRowLabel={(r) => `Pick ${r.name}`}
        />
      );
      expect(screen.getByLabelText('Pick Alpha')).toBeInTheDocument();
      expect(screen.getByLabelText('Pick Beta')).toBeInTheDocument();
    });

    it('clicking the checkbox cell does not bubble to the row click handler', () => {
      const onRowClick = vi.fn();
      const onSelectionChange = vi.fn();
      render(
        <IntDataTable
          columns={baseColumns}
          rows={baseRows}
          getRowKey={(r) => r.id}
          selectable
          selectedKeys={[]}
          onSelectionChange={onSelectionChange}
          onRowClick={onRowClick}
        />
      );
      fireEvent.click(screen.getByLabelText('Select row a'));
      expect(onSelectionChange).toHaveBeenCalled();
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });
});
