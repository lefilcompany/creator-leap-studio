export interface SlideBriefing {
  index: number;
  prompt: string;
  visualStyle?: string;
  cameraAngle?: string;
  lighting?: string;
  composition?: string;
  mood?: string;
  referenceImageUrl?: string;
}

export interface SlideState extends SlideBriefing {
  status?: "pending" | "generating" | "done" | "error";
  imageUrl?: string;
  childActionId?: string;
  error?: string | null;
}

export interface CarouselResult {
  slidesCount: number;
  slides: SlideState[];
  caption?: {
    title?: string;
    body?: string;
    hashtags?: string[];
  };
}
