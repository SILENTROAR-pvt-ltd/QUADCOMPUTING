import Image from 'next/image';

export default function BackgroundImage() {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="absolute inset-0 z-0 h-full w-full object-cover brightness-[0.68] contrast-110"
      fill
      priority
      sizes="100vw"
      src="/images/neuron-structure.jpg"
    />
  );
}
