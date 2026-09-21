import Image from 'next/image';
import type { CatalogItem } from '@/types/catalog';

interface ServiceCatalogProps {
  items: CatalogItem[];
  onAddFood?: () => void;
  onAddRoom?: () => void;
}

export default function ServiceCatalog({ items, onAddFood, onAddRoom }: ServiceCatalogProps) {
  const activeItems = items.filter((item) => item.status !== 'archived');
  const foodItems = activeItems.filter((item) => item.kind === 'food_beverage');
  const roomItems = activeItems.filter((item) => item.kind === 'accommodation');

  return (
    <section className="space-y-6 border-t border-white/10 pt-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-2xl text-white">Service Catalog</h2>
          <p className="mt-2 text-xs text-zinc-400">Food, beverage, accommodation, and tariff entries.</p>
        </div>
        {(onAddFood || onAddRoom) && <div className="flex gap-3">
          {onAddFood && <button className="rounded-full bg-white px-5 py-2.5 text-xs uppercase tracking-widest text-black hover:bg-zinc-300" onClick={onAddFood} type="button">+ Add Food Item</button>}
          {onAddRoom && <button className="rounded-full border border-white/20 bg-zinc-900 px-5 py-2.5 text-xs uppercase tracking-widest text-white hover:bg-zinc-800" onClick={onAddRoom} type="button">+ Add Accommodation</button>}
        </div>}
      </div>
      <CatalogGroup title={`Food & Beverage Items (${foodItems.length})`} items={foodItems} />
      <CatalogGroup title={`Accommodation / Tariffs (${roomItems.length})`} items={roomItems} />
    </section>
  );
}

function CatalogGroup({ title, items }: { title: string; items: CatalogItem[] }) {
  return <div className="space-y-3">
    <h3 className="text-xs uppercase tracking-widest text-zinc-500">{title}</h3>
    {items.length === 0 ? <p className="border border-dashed border-white/10 p-5 text-sm text-zinc-500">No entries registered yet.</p> : <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <CatalogRow item={item} key={item.id} />)}</div>}
  </div>;
}

function CatalogRow({ item }: { item: CatalogItem }) {
  const price = item.kind === 'food_beverage' ? item.price.amountMinor : item.nightlyRate.amountMinor;
  const label = item.kind === 'food_beverage' ? item.course : item.roomType;
  return <article className="flex gap-4 rounded-xl border border-white/10 bg-zinc-950 p-4">
    {item.imageUrl ? <div className="relative h-20 w-20 shrink-0"><Image alt="" className="rounded-lg border border-white/10 object-cover" fill sizes="80px" src={item.imageUrl} /></div> : <div className="h-20 w-20 shrink-0 rounded-lg border border-white/10 bg-zinc-900" />}
    <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h4 className="text-sm font-medium text-white">{item.name}</h4><span className="whitespace-nowrap text-xs text-white">Rs {price / 100}</span></div><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-400">{label.replace('_', ' ')}</p><p className="mt-2 line-clamp-1 text-xs text-zinc-400">{item.description || 'No description provided.'}</p>{item.addons.length > 0 && <p className="mt-1 text-[10px] text-zinc-500">{item.addons.length} add-on(s)</p>}</div>
  </article>;
}
