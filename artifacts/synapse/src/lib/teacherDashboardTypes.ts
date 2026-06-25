export type TeacherCourseSummary = {
  id: string;
  title: string;
  topicCount: number;
  fileCount: number;
  mastery?: number;
  status?: string;
  examDate?: string;
  lastStudied?: string;
  createdAt?: string;
};

export type TeacherPublishingSummary = {
  annotationCount: number;
  fileCount: number;
  courseCount: number;
  recent: Array<{
    id: string;
    courseId: string;
    fileKey: string;
    type: string;
    text: string;
    createdAt: string;
  }>;
};

export type TeacherDashboardResponse = {
  account: { id: string; email: string; plan: string };
  usage: {
    month: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    quota: number;
    remainingTokens: number;
  };
  library: {
    courseCount: number;
    fileCount: number;
    topicCount: number;
    glossaryCount: number;
    updatedAt?: string;
  };
  courses: TeacherCourseSummary[];
  publishing: TeacherPublishingSummary;
  features: {
    embeddings: boolean;
    rag: boolean;
    ner: boolean;
    stripe: boolean;
    ocr?: boolean;
    dedicatedNer?: boolean;
  };
  syncedAt: string;
};
