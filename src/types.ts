export type CameraMode = 'normal' | 'dual' | 'react' | 'overlay';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export interface RecordingSettings {
  timer: number;
  showGuides: boolean;
  mirrorFront: boolean;
  autoDateTime: boolean;
  projectName: string;
  fileName: string;
  showProjectName: boolean;
}
