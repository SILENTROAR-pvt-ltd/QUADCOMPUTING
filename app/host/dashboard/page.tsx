'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { calculateProfileScore, generateUniqueHostId } from '@/lib/utils/hostUtils';
import type { BusinessLocation, FoodMenuItem, HostProfile, RoomTariffItem } from '@/types/host';
import ProfileHeader from '@/components/host/ProfileHeader';
import PropertyBranches from '@/components/host/PropertyBranches';
import ServiceCatalog from '@/components/host/ServiceCatalog';

const fallbackImage = '/images/neuron-structure.jpg';
type ProvisioningPayload = { host?: Partial<HostProfile>; businesses?: BusinessLocation[] };

export default function HostDashboard() {
  const [profile, setProfile] = useState<HostProfile>({ hostId: generateUniqueHostId(), fullName: 'Host Owner', role: 'Host / Owner', phone: '', email: '', gender: '', dob: '', bio: '', categories: ['Cafe'] });
  const [businesses, setBusinesses] = useState<BusinessLocation[]>([]);
  const [foodMenu, setFoodMenu] = useState<FoodMenuItem[]>([]);
  const [roomTariffs, setRoomTariffs] = useState<RoomTariffItem[]>([]);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', category: 'Mains', price: '', description: '', imageUrl: '', addons: '' });
  const [newRoom, setNewRoom] = useState({ title: '', category: 'Luxury Suite', tariffPerNight: '', maxGuests: '2', imageUrl: '', addons: '' });

  useEffect(() => {
    const stored = sessionStorage.getItem('quad-provisioning');
    if (!stored) return;
    try {
      const payload = JSON.parse(stored) as ProvisioningPayload;
      if (payload.host) setProfile((current) => ({ ...current, ...payload.host, hostId: current.hostId }));
      if (payload.businesses?.length) setBusinesses(payload.businesses);
    } catch { sessionStorage.removeItem('quad-provisioning'); }
  }, []);

  function addFood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newFood.name || !newFood.price) return;
    setFoodMenu((items) => [...items, { id: `food_${Date.now()}`, name: newFood.name, category: newFood.category, price: Number(newFood.price), description: newFood.description, imageUrl: newFood.imageUrl || fallbackImage, addons: newFood.addons }]);
    setNewFood({ name: '', category: 'Mains', price: '', description: '', imageUrl: '', addons: '' });
    setFoodOpen(false);
  }
  function addRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newRoom.title || !newRoom.tariffPerNight) return;
    setRoomTariffs((items) => [...items, { id: `room_${Date.now()}`, title: newRoom.title, category: newRoom.category, tariffPerNight: Number(newRoom.tariffPerNight), maxGuests: Number(newRoom.maxGuests) || 2, imageUrl: newRoom.imageUrl || fallbackImage, addons: newRoom.addons }]);
    setNewRoom({ title: '', category: 'Luxury Suite', tariffPerNight: '', maxGuests: '2', imageUrl: '', addons: '' });
    setRoomOpen(false);
  }

  const completionScore = calculateProfileScore(profile, businesses, foodMenu, roomTariffs);
  return <div className="light-shell min-h-screen bg-white pb-20 text-black selection:bg-black selection:text-white">
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-zinc-950 px-5 py-4 md:px-8"><div className="flex items-center gap-3"><span className="font-serif text-xl">Quad Computing</span><span className="hidden border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-300 sm:inline-block">Host Control Center</span></div><span className="text-[10px] uppercase tracking-widest text-zinc-400">Status: Online</span></header>
    <main className="mx-auto mt-8 max-w-6xl space-y-10 px-4 md:px-8"><ProfileHeader profile={profile} completionScore={completionScore} onOpenEditDrawer={() => setEditProfileOpen(true)} /><PropertyBranches businesses={businesses} /><ServiceCatalog foodMenu={foodMenu} roomTariffs={roomTariffs} onAddFood={() => setFoodOpen(true)} onAddRoom={() => setRoomOpen(true)} /><div className="flex items-center justify-between border-t border-white/10 pt-6"><Link className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white" href="/">&lt;- Exit to Portal Root</Link><span className="text-xs text-zinc-600">Quad Computing Platform v1.0</span></div></main>
  </div>;
}
