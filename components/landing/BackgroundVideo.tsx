export default function BackgroundVideo() {
  return (
    <video
      aria-hidden="true"
      autoPlay
      className="absolute inset-0 z-0 h-full w-full object-cover"
      disablePictureInPicture
      loop
      muted
      preload="auto"
      playsInline
      tabIndex={-1}
    >
      <source src="/videos/quad-background.mp4" type="video/mp4" />
    </video>
  );
}
