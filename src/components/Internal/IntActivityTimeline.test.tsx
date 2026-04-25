import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IntActivityTimeline } from './IntActivityTimeline';
import { UserRole, type UserManagementAudit } from '@/types/auth';

const baseRow: UserManagementAudit = {
  id: 'r1',
  actor_id: 'actor-uuid',
  action: 'user_role_changed',
  target_user_id: 'target-uuid',
  created_at: '2026-04-20T10:00:00Z',
};

describe('IntActivityTimeline', () => {
  it('renders the empty message when rows is empty', () => {
    render(<IntActivityTimeline rows={[]} emptyMessage="Nothing happened" />);
    expect(screen.getByText('Nothing happened')).toBeInTheDocument();
  });

  it('renders the default empty message when none is supplied', () => {
    render(<IntActivityTimeline rows={[]} />);
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });

  it('uses resolveActor to display a name instead of the actor UUID', () => {
    render(
      <IntActivityTimeline
        rows={[baseRow]}
        resolveActor={(id) => (id === 'actor-uuid' ? 'Alice Admin' : id)}
      />
    );
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.queryByText('actor-uuid')).not.toBeInTheDocument();
  });

  it('falls back to the raw actor_id when resolveActor is omitted', () => {
    render(<IntActivityTimeline rows={[baseRow]} />);
    expect(screen.getByText('actor-uuid')).toBeInTheDocument();
  });

  it('shows the target_email span only for invite_* actions', () => {
    const inviteSent: UserManagementAudit = {
      ...baseRow,
      id: 'inv',
      action: 'invite_sent',
      target_email: 'new@example.com',
    };
    render(<IntActivityTimeline rows={[inviteSent]} />);
    expect(screen.getByText('new@example.com')).toBeInTheDocument();
  });

  it('hides target_email for non-invite actions even when present on the row', () => {
    const profileUpdate: UserManagementAudit = {
      ...baseRow,
      id: 'pu',
      action: 'user_profile_updated',
      target_email: 'leak@example.com',
    };
    render(<IntActivityTimeline rows={[profileUpdate]} />);
    expect(screen.queryByText('leak@example.com')).not.toBeInTheDocument();
  });

  describe('diff computation', () => {
    it('renders a diff row for each changed key with old + new chips', () => {
      const row: UserManagementAudit = {
        ...baseRow,
        id: 'role',
        old_values: { role: UserRole.TEACHER },
        new_values: { role: UserRole.REVIEWER },
      };
      const { container } = render(<IntActivityTimeline rows={[row]} />);
      const diffChips = container.querySelectorAll('.adm-timeline-diff-chip');
      const labels = Array.from(diffChips).map((c) => c.textContent);
      expect(labels).toEqual(expect.arrayContaining(['role', 'teacher', '→ reviewer']));
    });

    it('omits unchanged keys (deep-equal old/new)', () => {
      const row: UserManagementAudit = {
        ...baseRow,
        id: 'noop',
        old_values: { role: UserRole.TEACHER, full_name: 'unchanged' },
        new_values: { role: UserRole.REVIEWER, full_name: 'unchanged' },
      };
      const { container } = render(<IntActivityTimeline rows={[row]} />);
      const keyChips = container.querySelectorAll('.adm-timeline-diff-chip--key');
      const keys = Array.from(keyChips).map((c) => c.textContent);
      expect(keys).toContain('role');
      expect(keys).not.toContain('full_name');
    });

    it('omits the old chip when old value is null/undefined/empty (initial set)', () => {
      const row: UserManagementAudit = {
        ...baseRow,
        id: 'init',
        old_values: { full_name: '' },
        new_values: { full_name: 'Test User' },
      };
      const { container } = render(<IntActivityTimeline rows={[row]} />);
      // old chip should NOT render for empty string
      const oldChips = container.querySelectorAll('.adm-timeline-diff-chip--old');
      expect(oldChips).toHaveLength(0);
      const newChips = container.querySelectorAll('.adm-timeline-diff-chip--new');
      expect(newChips).toHaveLength(1);
      expect(newChips[0].textContent).toContain('Test User');
    });

    it('formats array values via the default formatter ("a, b" or "(none)")', () => {
      const row: UserManagementAudit = {
        ...baseRow,
        id: 'arr',
        old_values: { grades_taught: [] },
        new_values: { grades_taught: ['3', '4'] },
      };
      const { container } = render(<IntActivityTimeline rows={[row]} />);
      const newChip = container.querySelector('.adm-timeline-diff-chip--new')!;
      expect(newChip.textContent).toContain('3, 4');
    });

    it('uses a custom formatDiffValue when supplied', () => {
      const row: UserManagementAudit = {
        ...baseRow,
        id: 'fmt',
        old_values: { school_name: 'sch-1' },
        new_values: { school_name: 'sch-2' },
      };
      render(
        <IntActivityTimeline
          rows={[row]}
          formatDiffValue={(_key, val) => (val === 'sch-1' ? 'Old School' : 'New School')}
        />
      );
      expect(screen.getByText('Old School')).toBeInTheDocument();
      expect(screen.getByText('→ New School')).toBeInTheDocument();
    });
  });

  it('renders multiple rows in order', () => {
    const rows: UserManagementAudit[] = [
      { ...baseRow, id: 'r1', action: 'user_activated' },
      { ...baseRow, id: 'r2', action: 'user_deactivated' },
    ];
    const { container } = render(<IntActivityTimeline rows={rows} />);
    const items = container.querySelectorAll('.adm-timeline-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('activated account');
    expect(items[1].textContent).toContain('deactivated account');
  });
});
