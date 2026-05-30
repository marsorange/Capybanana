// Tiny module bus so 2D zoom buttons (outside the Canvas) can nudge the
// orthographic camera zoom (inside the Canvas). One canvas is active at a time.
export const zoomBus = { factor: 1 };

export const requestZoom = (f: number) => {
  zoomBus.factor *= f;
};
