'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, ToggleLeft, ToggleRight, MapPin } from 'lucide-react';
import {
  useGetBazarsQuery,
  useCreateBazarMutation,
  useUpdateBazarMutation,
  useDeleteBazarMutation,
} from '../../../../store/api/bazarApi';

const emptyForm = {
  name:     '',
  nameBn:   '',
  area:     '',
  city:     'Dhaka',
  lat:      23.8103,
  lng:      90.4125,
  isActive: true,
};

export function AdminBazars() {
  const [showForm, setShowForm]               = useState(false);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [form, setForm]                       = useState({ ...emptyForm });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [page, setPage]                       = useState(1);
  const limit = 15;

  const { data: res, isLoading } = useGetBazarsQuery({ limit, page, includeInactive: true });
  const [createBazar, { isLoading: creating }] = useCreateBazarMutation();
  const [updateBazar, { isLoading: updating }] = useUpdateBazarMutation();
  const [deleteBazar, { isLoading: deleting }] = useDeleteBazarMutation();

  const bazars: any[]   = res?.data?.attributes?.data || [];
  const totalPages      = Math.ceil((res?.data?.attributes?.totalResults || 0) / limit);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (b: any) => {
    setForm({
      name:     b.name     || '',
      nameBn:   b.nameBn   || '',
      area:     b.area     || '',
      city:     b.city     || 'Dhaka',
      lat:      b.lat      ?? 23.8103,
      lng:      b.lng      ?? 90.4125,
      isActive: b.isActive ?? true,
    });
    setEditingId(b._id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await updateBazar({ id: editingId, ...form }).unwrap();
    } else {
      await createBazar(form).unwrap();
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleDelete = async (id: string) => {
    await deleteBazar(id).unwrap();
    setDeleteConfirmId(null);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#064E3B]">বাজার ম্যানেজমেন্ট</h1>
          <p className="text-sm text-slate-500 mt-1">বাজার যোগ, সম্পাদনা ও মুছুন</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[#064E3B] text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-[#043d2e] transition-colors">
          <Plus className="w-4 h-4" /> নতুন বাজার
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6 flex flex-col gap-4 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#064E3B]">{editingId ? 'বাজার সম্পাদনা' : 'নতুন বাজার'}</h2>
            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">বাজারের নাম (বাংলা)</label>
              <input value={form.nameBn} onChange={e => setForm(f => ({ ...f, nameBn: e.target.value }))}
                placeholder="যেমন: কারওয়ান বাজার"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Bazar Name (English)</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Karwan Bazar"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">এলাকা (Area)</label>
              <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                placeholder="যেমন: তেজগাঁও"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">শহর (City)</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Dhaka"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: +e.target.value }))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-num focus:outline-none focus:ring-2 focus:ring-blue-300/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Longitude</label>
              <input type="number" step="any" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: +e.target.value }))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-num focus:outline-none focus:ring-2 focus:ring-blue-300/30" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
              {form.isActive
                ? <ToggleRight className="w-8 h-8 text-emerald-600" />
                : <ToggleLeft  className="w-8 h-8 text-slate-400" />}
            </button>
            <span className="text-sm font-medium text-slate-600">
              {form.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
            </span>
          </div>

          <button onClick={handleSubmit} disabled={creating || updating || !form.nameBn}
            className="flex items-center justify-center gap-2 bg-[#064E3B] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#043d2e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Check className="w-4 h-4" />
            {creating || updating ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'আপডেট করুন' : 'বাজার তৈরি করুন'}
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : bazars.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-bold text-slate-600">কোনো বাজার নেই</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {bazars.map((b: any) => (
              <div key={b._id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{b.nameBn || b.name}</p>
                  <p className="text-xs text-slate-400 truncate">{b.area && `${b.area}, `}{b.city}</p>
                  <p className="text-xs font-num text-slate-400 mt-0.5">{b.lat?.toFixed(4)}, {b.lng?.toFixed(4)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {b.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)}
                      className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteConfirmId(b._id)}
                      className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium disabled:opacity-40 hover:bg-slate-200 transition-colors">
                ← আগে
              </button>
              <span className="text-sm text-slate-500 font-num">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium disabled:opacity-40 hover:bg-slate-200 transition-colors">
                পরে →
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-4xl text-center mb-3">🗑️</p>
            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">বাজার মুছবেন?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">এই বাজারটি স্থায়ীভাবে মুছে যাবে।</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                বাতিল
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={deleting}
                className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? '...' : 'মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
