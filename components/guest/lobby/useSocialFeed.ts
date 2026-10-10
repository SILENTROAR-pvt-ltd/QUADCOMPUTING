// components/guest/lobby/useSocialFeed.ts
'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LobbyPublicMessage } from '@/lib/store/guest-lobby.store';
import type { LobbyPost, ThreadReply } from './types';

export type Post = LobbyPost;

interface Props {
  cafeId: string;
  messages?: LobbyPublicMessage[];
  currentSessionId?: string;
  currentUserName: string;
  currentUserTable: string;
  onPostMessage?: (content: string) => Promise<void>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useSocialFeed({
  cafeId,
  messages: ext,
  currentUserName,
  currentUserTable,
  onPostMessage,
  textareaRef,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (ext && ext.length > 0) {
      setPosts(
        ext.map((m) => ({
          id: m.id,
          author: m.guest_name || 'Guest',
          table: m.table_number || 'Lobby',
          content: m.content,
          timestamp: m.created_at
            ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now',
          likes: 0,
          replies: [],
        }))
      );
      return;
    }

    setPosts([]);

    fetch(`/api/guest/lobby?type=messages&cafe_id=${encodeURIComponent(cafeId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          setPosts(
            data.messages.map(
              (m: any) => ({
                id: m.id,
                author: m.guest_name || 'Guest',
                table: m.table_number || 'Lobby',
                content: m.content,
                imageUrl: m.image_url || m.imageUrl || undefined,
                timestamp: m.created_at
                  ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now',
                likes: 0,
                replies: [],
              })
            )
          );
        }
      })
      .catch(() => {});

    // Supabase Realtime Live Postgres Sync
    let channel: any;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`realtime-lobby-messages-${cafeId || 'default'}`)
        .on(
          'postgres_changes',
          // Without a filter every venue's messages arrive on this subscription.
          { event: 'INSERT', schema: 'public', table: 'lobby_messages', filter: `business_id=eq.${cafeId}` },
          (payload: any) => {
            const m = payload.new;
            if (m) {
              setPosts((prev) => [
                {
                  id: m.id,
                  author: m.guest_name || 'Guest',
                  table: m.table_number || 'Lobby',
                  content: m.content,
                  imageUrl: m.image_url || m.imageUrl || undefined,
                  timestamp: 'Just now',
                  likes: 0,
                  replies: [],
                },
                ...prev.filter((p) => p.id !== m.id),
              ]);
            }
          }
        )
        .subscribe();
    } catch {}

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [mounted, cafeId, ext]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = newPost.trim();
      if ((!content && !imageFile) || isSubmitting) return;

      const capturedPreview = imagePreview;
      setNewPost('');
      clearImage();
      setIsSubmitting(true);

      const activeAuthor = currentUserName && currentUserName !== 'You' && currentUserName !== 'Guest'
        ? currentUserName
        : (typeof window !== 'undefined' ? localStorage.getItem('guest_handle') || currentUserName : currentUserName);

      const post: Post = {
        id: `p-${Date.now()}`,
        author: activeAuthor,
        table: currentUserTable,
        content: content || '',
        imageUrl: capturedPreview ?? undefined,
        timestamp: 'Just now',
        likes: 0,
        isNew: true,
        replies: [],
      };

      setPosts((prev) => [post, ...prev]);
      setTimeout(() => {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, isNew: false } : p)));
      }, 2400);

      try {
        if (onPostMessage && content) await onPostMessage(content);
      } catch (err) {
        console.error('Broadcast failed:', err);
      } finally {
        setIsSubmitting(false);
        textareaRef.current?.focus();
      }
    },
    [newPost, imageFile, imagePreview, isSubmitting, currentUserName, currentUserTable, onPostMessage, clearImage, textareaRef]
  );

  const handleLike = useCallback((postId: string) => {
    setLikedIds((prev) => {
      const liked = !prev[postId];
      setPosts((l) =>
        l.map((p) =>
          p.id === postId ? { ...p, likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1) } : p
        )
      );
      return { ...prev, [postId]: liked };
    });
  }, []);

  const handleAddReply = useCallback(
    (postId: string, content: string) => {
      const newReply: ThreadReply = {
        id: `reply-${Date.now()}`,
        author: currentUserName,
        table: currentUserTable,
        content,
        timestamp: 'Just now',
      };
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: [...(p.replies || []), newReply] } : p))
      );
    },
    [currentUserName, currentUserTable]
  );

  const toggleThread = useCallback((postId: string) => {
    setOpenThreadId((prev) => (prev === postId ? null : postId));
  }, []);

  return {
    mounted,
    posts,
    newPost,
    setNewPost,
    imageFile,
    imagePreview,
    likedIds,
    isSubmitting,
    selectedPhoto,
    setSelectedPhoto,
    openThreadId,
    toggleThread,
    handleAddReply,
    handleSubmit,
    handleLike,
    handleImageSelect,
    clearImage,
  };
}

export default useSocialFeed;
