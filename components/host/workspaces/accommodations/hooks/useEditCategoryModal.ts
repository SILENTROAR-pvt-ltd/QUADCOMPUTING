'use client';

import { useState, useEffect } from 'react';
import type { RoomCategory, PhysicalRoom, RoomAddon } from '@/types';

interface UseEditCategoryModalProps {
  category: RoomCategory | null;
  rooms: PhysicalRoom[];
  onUpdated: () => void;
  onClose: () => void;
}

export function useEditCategoryModal({
  category,
  rooms,
  onUpdated,
  onClose,
}: UseEditCategoryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'rooms'>('rooms');

  // Category Fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [occupancy, setOccupancy] = useState('2');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoList, setPhotoList] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenityText, setCustomAmenityText] = useState('');
  const [addons, setAddons] = useState<RoomAddon[]>([]);

  // Physical Rooms
  const [existingUnits, setExistingUnits] = useState<
    { id: string; originalNumber: string; currentNumber: string; status: string }[]
  >([]);
  const [newUnits, setNewUnits] = useState<string[]>([]);
  const [deletedRoomIds, setDeletedRoomIds] = useState<string[]>([]);
  const [singleNewRoomInput, setSingleNewRoomInput] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setPrice(String(category.price || ''));
      setOccupancy(String(category.occupancy || 2));
      setPhotoList(Array.isArray(category.photos) ? category.photos : []);
      setSelectedAmenities(Array.isArray(category.amenities) ? category.amenities : []);
      const initialAddons = (category.addons || category.available_addons || []) as RoomAddon[];
      setAddons(Array.isArray(initialAddons) ? initialAddons : []);

      const catRooms = rooms.filter((r) => r.category_id === category.id);
      setExistingUnits(
        catRooms.map((r) => ({
          id: r.id,
          originalNumber: r.room_number,
          currentNumber: r.room_number,
          status: r.status,
        }))
      );
      setNewUnits([]);
      setDeletedRoomIds([]);
      setSingleNewRoomInput('');
    }
  }, [category, rooms]);

  const handleAddPhoto = () => {
    if (!photoUrl.trim()) return;
    setPhotoList((prev) => [...prev, photoUrl.trim()]);
    setPhotoUrl('');
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoList((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenityText.trim();
    if (!trimmed) return;
    if (!selectedAmenities.includes(trimmed)) {
      setSelectedAmenities((prev) => [...prev, trimmed]);
    }
    setCustomAmenityText('');
  };

  const handleRoomNumberChange = (id: string, newNum: string) => {
    setExistingUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, currentNumber: newNum } : u))
    );
  };

  const handleDeleteExistingRoom = (id: string, status: string) => {
    if (status === 'OCCUPIED') {
      alert('Cannot delete an occupied room. Check out guest first.');
      return;
    }
    if (confirm('Are you sure you want to remove this room unit?')) {
      setDeletedRoomIds((prev) => [...prev, id]);
      setExistingUnits((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleAddNewRoom = () => {
    const trimmed = singleNewRoomInput.trim();
    if (!trimmed) return;
    const parts = trimmed
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    setNewUnits((prev) => [...prev, ...parts]);
    setSingleNewRoomInput('');
  };

  const handleRemoveNewRoom = (idx: number) => {
    setNewUnits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    if (!name.trim() || !price) {
      alert('Category name and price are required');
      return;
    }

    const updatedRoomsPayload = existingUnits
      .filter((u) => u.currentNumber.trim() && u.currentNumber.trim() !== u.originalNumber)
      .map((u) => ({ id: u.id, room_number: u.currentNumber.trim() }));

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/host/accommodations/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: category.id,
          name: name.trim(),
          price: parseFloat(price),
          occupancy: parseInt(occupancy, 10) || 2,
          photos: photoList,
          amenities: selectedAmenities,
          addons,
          updated_rooms: updatedRoomsPayload,
          new_room_numbers: newUnits,
          deleted_room_ids: deletedRoomIds,
        }),
      });

      if (res.ok) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet:refresh'));
        }
        onUpdated();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update room category');
      }
    } catch (err) {
      console.error('Update error', err);
      alert('Network error while updating room category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTotalUnits = existingUnits.length + newUnits.length;

  return {
    isSubmitting,
    activeTab,
    setActiveTab,
    name,
    setName,
    price,
    setPrice,
    occupancy,
    setOccupancy,
    photoUrl,
    setPhotoUrl,
    photoList,
    handleAddPhoto,
    handleRemovePhoto,
    selectedAmenities,
    toggleAmenity,
    customAmenityText,
    setCustomAmenityText,
    handleAddCustomAmenity,
    addons,
    setAddons,
    existingUnits,
    newUnits,
    singleNewRoomInput,
    setSingleNewRoomInput,
    activeTotalUnits,
    handleRoomNumberChange,
    handleDeleteExistingRoom,
    handleAddNewRoom,
    handleRemoveNewRoom,
    handleSaveAll,
  };
}
