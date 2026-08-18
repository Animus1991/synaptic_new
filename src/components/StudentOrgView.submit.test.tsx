/** @vitest-environment jsdom */
/**
 * Phase 1 — student assignment submission flow (client side).
 * Locks the gap fix: students can submit work from My institution, the row
 * flips to "Submitted", and resubmission stays available.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StudentOrgView } from './StudentOrgView';
import type { UserSettings } from '../types';
import * as orgClient from '../lib/orgClient';
import * as dashboardClient from '../lib/studentDashboardClient';

vi.mock('../lib/orgClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/orgClient')>();
  return {
    ...actual,
    fetchStudentClasses: vi.fn(),
    fetchStudentOrgs: vi.fn(),
    fetchStudentAnnouncements: vi.fn(),
    submitStudentAssignment: vi.fn(),
  };
});

vi.mock('../lib/studentDashboardClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/studentDashboardClient')>();
  return { ...actual, fetchStudentDashboard: vi.fn() };
});

const settings = { authToken: 'tok', language: 'en' } as UserSettings;

const classRow = {
  class: { id: 'cls1', name: 'Biology 101' },
  enrollment: { id: 'enr1' },
  assignments: [{ id: 'asg1', title: 'Essay 1', dueAt: '2026-09-01T00:00:00.000Z' }],
  gradeCells: [] as { assignmentId: string; score?: number; status: string }[],
  submissions: [] as orgClient.StudentAssignmentSubmission[],
};

const emptyDashboard: dashboardClient.StudentDashboard = {
  email: 'student@example.com',
  classCount: 1,
  orgCount: 0,
  avgScore: null,
  completionRate: null,
  overdueCount: 0,
  upcomingCount: 0,
  classes: [],
  upcoming: [],
  generatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.mocked(orgClient.fetchStudentClasses).mockResolvedValue({
    email: 'student@example.com',
    classes: [structuredClone(classRow)],
  });
  vi.mocked(orgClient.fetchStudentOrgs).mockResolvedValue({ orgs: [] });
  vi.mocked(orgClient.fetchStudentAnnouncements).mockResolvedValue({
    email: 'student@example.com',
    announcements: [],
  });
  vi.mocked(dashboardClient.fetchStudentDashboard).mockResolvedValue(emptyDashboard);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StudentOrgView — assignment submission', () => {
  it('submits work and flips the row to Submitted without a refetch', async () => {
    vi.mocked(orgClient.submitStudentAssignment).mockResolvedValue({
      submission: {
        id: 'sub1',
        assignmentId: 'asg1',
        body: 'My essay',
        submittedAt: '2026-08-15T10:00:00.000Z',
        updatedAt: '2026-08-15T10:00:00.000Z',
      },
      cell: { assignmentId: 'asg1', enrollmentId: 'enr1', status: 'submitted' },
    });

    render(<StudentOrgView settings={settings} lang="en" />);

    const toggle = await screen.findByTestId('student-submit-toggle-asg1');
    expect(toggle).toHaveTextContent('Submit');
    fireEvent.click(toggle);

    fireEvent.change(screen.getByTestId('assignment-submit-body'), {
      target: { value: 'My essay' },
    });
    fireEvent.click(screen.getByTestId('assignment-submit-cta'));

    await waitFor(() => {
      expect(orgClient.submitStudentAssignment).toHaveBeenCalledWith(
        'tok',
        settings,
        'cls1',
        'asg1',
        { body: 'My essay', linkUrl: undefined },
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('student-submit-toggle-asg1')).toHaveTextContent('Resubmit');
    });
    expect(screen.getByTestId('student-assignment-submitted-body-asg1')).toHaveTextContent('My essay');
    expect(vi.mocked(orgClient.fetchStudentClasses)).toHaveBeenCalledTimes(1);
  });

  it('blocks an empty submission with an inline error', async () => {
    render(<StudentOrgView settings={settings} lang="en" />);

    fireEvent.click(await screen.findByTestId('student-submit-toggle-asg1'));
    fireEvent.click(screen.getByTestId('assignment-submit-cta'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/text, a link, or a file/i);
    expect(orgClient.submitStudentAssignment).not.toHaveBeenCalled();
  });

  it('shows the assignment description and asks before replacing an existing submission', async () => {
    vi.mocked(orgClient.fetchStudentClasses).mockResolvedValue({
      email: 'student@example.com',
      classes: [
        {
          ...structuredClone(classRow),
          assignments: [
            {
              id: 'asg1',
              title: 'Essay 1',
              description: 'Write 500 words on mitosis.',
              dueAt: '2026-09-01T00:00:00.000Z',
            },
          ],
          gradeCells: [{ assignmentId: 'asg1', status: 'submitted' }],
          submissions: [
            {
              id: 'sub1',
              assignmentId: 'asg1',
              body: 'First draft',
              linkUrl: 'https://docs.example.com/essay',
              submittedAt: '2026-08-15T10:00:00.000Z',
              updatedAt: '2026-08-15T10:00:00.000Z',
            },
          ],
        },
      ],
    });
    vi.mocked(orgClient.submitStudentAssignment).mockResolvedValue({
      submission: {
        id: 'sub1',
        assignmentId: 'asg1',
        body: 'Second draft',
        submittedAt: '2026-08-15T10:00:00.000Z',
        updatedAt: '2026-08-15T11:00:00.000Z',
      },
      cell: { assignmentId: 'asg1', enrollmentId: 'enr1', status: 'submitted' },
    });

    render(<StudentOrgView settings={settings} lang="en" />);

    expect(await screen.findByTestId('student-assignment-description-asg1')).toHaveTextContent(
      /mitosis/i,
    );
    expect(screen.getByTestId('student-assignment-submitted-body-asg1')).toHaveTextContent(
      /First draft/,
    );
    expect(screen.getByTestId('student-assignment-submitted-link-asg1')).toHaveAttribute(
      'href',
      'https://docs.example.com/essay',
    );

    fireEvent.click(screen.getByTestId('student-submit-toggle-asg1'));
    fireEvent.change(screen.getByTestId('assignment-submit-body'), {
      target: { value: 'Second draft' },
    });
    fireEvent.click(screen.getByTestId('assignment-submit-cta'));

    expect(orgClient.submitStudentAssignment).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId('assignment-resubmit-confirm-confirm'));

    await waitFor(() => {
      expect(orgClient.submitStudentAssignment).toHaveBeenCalledWith(
        'tok',
        settings,
        'cls1',
        'asg1',
        { body: 'Second draft', linkUrl: 'https://docs.example.com/essay' },
      );
    });
  });

  it('opens the submit form from the upcoming list', async () => {
    vi.mocked(dashboardClient.fetchStudentDashboard).mockResolvedValue({
      ...emptyDashboard,
      upcomingCount: 1,
      upcoming: [
        {
          classId: 'cls1',
          className: 'Biology 101',
          assignmentId: 'asg1',
          title: 'Essay 1',
          dueAt: '2026-09-01T00:00:00.000Z',
          status: 'pending',
        },
      ],
    });

    render(<StudentOrgView settings={settings} lang="en" />);

    fireEvent.click(await screen.findByTestId('student-upcoming-open-asg1'));
    expect(await screen.findByTestId('assignment-submit-form')).toBeInTheDocument();
  });

  it('submits a file-only assignment and lists the attachment', async () => {
    const file = new File(['hello notes'], 'notes.pdf', { type: 'application/pdf' });
    vi.mocked(orgClient.submitStudentAssignment).mockResolvedValue({
      submission: {
        id: 'sub-file',
        assignmentId: 'asg1',
        body: '',
        attachments: [{ id: 'att_1', name: 'notes.pdf', mime: 'application/pdf', size: 11 }],
        submittedAt: '2026-08-15T10:00:00.000Z',
        updatedAt: '2026-08-15T10:00:00.000Z',
      },
      cell: { assignmentId: 'asg1', enrollmentId: 'enr1', status: 'submitted' },
    });

    render(<StudentOrgView settings={settings} lang="en" />);
    fireEvent.click(await screen.findByTestId('student-submit-toggle-asg1'));
    fireEvent.change(screen.getByTestId('assignment-submit-files'), { target: { files: [file] } });
    expect(screen.getByTestId('assignment-submit-file-list')).toHaveTextContent('notes.pdf');
    fireEvent.click(screen.getByTestId('assignment-submit-cta'));

    await waitFor(() => {
      expect(orgClient.submitStudentAssignment).toHaveBeenCalled();
    });
    const payload = vi.mocked(orgClient.submitStudentAssignment).mock.calls[0]?.[4];
    expect(payload?.body).toBe('');
    expect(payload?.attachments).toHaveLength(1);
    expect(payload?.attachments?.[0]?.name).toBe('notes.pdf');
    expect(payload?.attachments?.[0]?.contentBase64).toBeTruthy();
    expect(await screen.findByTestId('student-assignment-submitted-files-asg1')).toHaveTextContent(
      'notes.pdf',
    );
  });
});
