import { describe, expect, it, vi } from 'vitest';
import { captureUploadSnapshot, extendCourseTopicCount, restoreUploadSnapshot } from './uploadTransaction';
import { mockCourses, mockDashboardStats, mockLearnerModel } from '../demo/mockData';

describe('uploadTransaction', () => {
  it('captureUploadSnapshot returns shallow refs (rollback uses same arrays)', () => {
    const courses = mockCourses.slice(0, 1);
    const snap = captureUploadSnapshot({
      courses,
      uploadedFiles: [],
      glossaryEntries: [],
      tasks: [],
      betaMastery: [],
      learnerModel: mockLearnerModel,
      activities: [],
      dashboardStats: mockDashboardStats,
      selectedCourseId: courses[0].id,
    });
    expect(snap.courses).toBe(courses);
    expect(snap.selectedCourseId).toBe(courses[0].id);
  });

  it('extendCourseTopicCount reads topic length for extend target', () => {
    expect(extendCourseTopicCount(mockCourses, mockCourses[0].id)).toBe(mockCourses[0].topics.length);
    expect(extendCourseTopicCount(mockCourses, 'missing')).toBe(0);
  });

  it('restoreUploadSnapshot rewinds all store slices', () => {
    const courses = mockCourses.slice(0, 1);
    const snap = captureUploadSnapshot({
      courses,
      uploadedFiles: [],
      glossaryEntries: [],
      tasks: [],
      betaMastery: [],
      learnerModel: mockLearnerModel,
      activities: [],
      dashboardStats: { ...mockDashboardStats, streak: 1 },
      selectedCourseId: courses[0].id,
    });
    const setCourses = vi.fn();
    const setSelectedCourse = vi.fn();
    restoreUploadSnapshot(snap, {
      setCourses,
      setUploadedFiles: vi.fn(),
      setGlossaryEntries: vi.fn(),
      setTasks: vi.fn(),
      setBetaMastery: vi.fn(),
      setLearnerModel: vi.fn(),
      setActivities: vi.fn(),
      setDashboardStats: vi.fn(),
      setSelectedCourse,
    });
    expect(setCourses).toHaveBeenCalledWith(courses);
    expect(setSelectedCourse).toHaveBeenCalledWith(courses[0]);
  });
});
