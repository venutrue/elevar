import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  MessageCircle,
  Loader2,
  Send,
  Hash,
  Users,
  Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import useApi from '@/hooks/useApi';
import api from '@/api/client';
import { useAuth } from '@/context/AuthContext';

// ---- Types ----

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  description: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_name: string | null;
  member_count: number;
  created_at: string;
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_first_name: string;
  sender_last_name: string;
  content: string;
  created_at: string;
}

// ---- Helpers ----

function roomTypeIcon(type: string) {
  switch (type) {
    case 'direct': return <MessageCircle className="w-4 h-4" />;
    case 'group': return <Users className="w-4 h-4" />;
    case 'private': return <Lock className="w-4 h-4" />;
    default: return <Hash className="w-4 h-4" />;
  }
}

function roomTypeBadgeColor(type: string): 'blue' | 'green' | 'purple' | 'gray' {
  switch (type) {
    case 'direct': return 'blue';
    case 'group': return 'green';
    case 'private': return 'purple';
    default: return 'gray';
  }
}

function formatTime(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-IN', { weekday: 'short' });
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatMessageTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMessageDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ---- Component ----

export default function Chat() {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchRooms, setSearchRooms] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: '',
    room_type: 'group',
    description: '',
  });

  const { data: rooms, loading: loadingRooms, refetch: refetchRooms } = useApi<ChatRoom[]>(
    () => api.get('/chat/rooms'),
    []
  );

  const { data: messages, loading: loadingMessages, refetch: refetchMessages } = useApi<ChatMessage[]>(
    () =>
      selectedRoom
        ? api.get(`/chat/rooms/${selectedRoom.id}/messages`)
        : Promise.resolve([]),
    [selectedRoom?.id]
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredRooms = (rooms || []).filter((r) => {
    if (!searchRooms) return true;
    return r.name.toLowerCase().includes(searchRooms.toLowerCase());
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom) return;
    setSubmitting(true);
    try {
      await api.post(`/chat/rooms/${selectedRoom.id}/messages`, {
        content: messageInput.trim(),
      });
      setMessageInput('');
      refetchMessages();
      refetchRooms();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateRoom = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const newRoom = await api.post<ChatRoom>('/chat/rooms', {
        name: form.name,
        room_type: form.room_type,
        description: form.description || undefined,
      });
      setShowCreateModal(false);
      setForm({ name: '', room_type: 'group', description: '' });
      refetchRooms();
      setSelectedRoom(newRoom);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  // Group messages by date
  const messagesByDate: { date: string; messages: ChatMessage[] }[] = [];
  if (messages) {
    let currentDate = '';
    for (const msg of messages) {
      const msgDate = formatMessageDate(msg.created_at);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        messagesByDate.push({ date: msgDate, messages: [msg] });
      } else {
        messagesByDate[messagesByDate.length - 1].messages.push(msg);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          <p className="text-sm text-gray-500 mt-1">Team conversations and messaging</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Room
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left Panel: Room List */}
        <Card className="w-80 flex-shrink-0 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchRooms}
                onChange={(e) => setSearchRooms(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No rooms found</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedRoom?.id === room.id ? 'bg-indigo-50 border-l-2 border-l-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-400">{roomTypeIcon(room.room_type)}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{room.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTime(room.last_message_at)}
                    </span>
                  </div>
                  {room.last_message && (
                    <p className="text-xs text-gray-500 truncate">
                      {room.last_sender_name && (
                        <span className="font-medium">{room.last_sender_name}: </span>
                      )}
                      {room.last_message}
                    </p>
                  )}
                  <div className="mt-1">
                    <Badge color={roomTypeBadgeColor(room.room_type)}>
                      {room.room_type}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Right Panel: Chat Messages */}
        <Card className="flex-1 flex flex-col">
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<MessageCircle className="w-8 h-8 text-gray-400" />}
                title="Select a conversation"
                description="Choose a chat room from the list to start messaging."
              />
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                <span className="text-gray-400">{roomTypeIcon(selectedRoom.room_type)}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{selectedRoom.name}</h3>
                  {selectedRoom.description && (
                    <p className="text-xs text-gray-500">{selectedRoom.description}</p>
                  )}
                </div>
                <Badge color={roomTypeBadgeColor(selectedRoom.room_type)} className="ml-auto">
                  {selectedRoom.member_count} members
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messagesByDate.map(({ date, messages: dayMessages }) => (
                    <div key={date}>
                      <div className="flex items-center gap-4 my-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">{date}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      {dayMessages.map((msg) => {
                        const isSender = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex mb-3 ${isSender ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isSender
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {!isSender && (
                                <p className={`text-xs font-medium mb-1 ${isSender ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                  {msg.sender_first_name} {msg.sender_last_name}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isSender ? 'text-indigo-200' : 'text-gray-400'}`}>
                                {formatMessageTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="flex items-end gap-2">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 max-h-32"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || submitting}
                    className="flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create Room Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Chat Room">
        <div className="space-y-4">
          <Input
            label="Room Name"
            placeholder="e.g., Property Updates"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            label="Room Type"
            value={form.room_type}
            onChange={(e) => setForm({ ...form, room_type: e.target.value })}
          >
            <option value="group">Group</option>
            <option value="private">Private</option>
            <option value="channel">Channel</option>
          </Select>
          <Textarea
            label="Description (optional)"
            placeholder="Room description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRoom} disabled={submitting || !form.name.trim()}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Room
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
