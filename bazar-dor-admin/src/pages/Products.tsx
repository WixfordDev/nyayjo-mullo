import { useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, Camera, X } from 'lucide-react';
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '../store/api/productApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'vegetable','fish','meat','dairy','grain','pulse',
  'oil','spice','fruit','bakery','protein','beverage',
  'frozen','dry_food','other',
];
const empty = { name: '', nameBn: '', unit: 'kg', category: 'other' };

export function Products() {
  const [search, setSearch]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm]         = useState({ ...empty });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: res, isLoading } = useGetProductsQuery({ limit: 100 });
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();

  const items: any[] = res?.data?.attributes?.data || [];
  const filtered = items.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.nameBn?.includes(search)
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
    setForm({ ...empty });
    removeImage();
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name || '', nameBn: item.nameBn || '', unit: item.unit || 'kg', category: item.category || 'other' });
    setImageFile(null);
    setImagePreview(item.image || null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('nameBn', form.nameBn);
    fd.append('unit', form.unit);
    fd.append('category', form.category);
    if (imageFile) fd.append('image', imageFile);

    try {
      if (editItem) {
        await updateProduct({ id: editItem._id, formData: fd }).unwrap();
        toast.success('আপডেট হয়েছে');
      } else {
        await createProduct(fd).unwrap();
        toast.success('পণ্য তৈরি হয়েছে');
      }
      closeForm();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId).unwrap();
      toast.success('মুছে গেছে');
      setDeleteId(null);
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">পণ্য</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} টি পণ্য</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> নতুন পণ্য
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="পণ্য খুঁজুন..." className="input pl-10" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">পণ্য</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">ইউনিট</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">ক্যাটাগরি</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">স্ট্যাটাস</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">কোনো পণ্য পাওয়া যায়নি</td></tr>
            ) : filtered.map(item => (
              <tr key={item._id} className="table-row">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img src={item.image} alt={item.nameBn || item.name} className="w-9 h-9 rounded-lg object-cover bg-slate-50" />
                    ) : (
                      <span className="text-2xl w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">🛒</span>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">{item.nameBn || item.name}</p>
                      <p className="text-xs text-slate-400">{item.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{item.unit}</td>
                <td className="px-5 py-3.5">
                  {item.category && <span className="badge bg-blue-50 text-blue-700">{item.category}</span>}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`badge ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(item._id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editItem ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য'} onClose={closeForm}>
          <div className="flex flex-col gap-4">
            {/* Image upload */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">পণ্যের ছবি</label>
              {imagePreview ? (
                <div className="relative w-24 h-24">
                  <img src={imagePreview} alt="preview" className="w-24 h-24 rounded-xl object-cover border border-slate-200" />
                  <button onClick={removeImage} type="button"
                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">ছবি যুক্ত করুন</span>
                </button>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">নাম (বাংলা)</label>
                <input value={form.nameBn} onChange={e => setForm(f => ({ ...f, nameBn: e.target.value }))} placeholder="যেমন: টমেটো" className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Name (English)</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tomato" className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ইউনিট</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="select">
                  {['kg','g','piece','dozen','liter','ml','packet'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ক্যাটাগরি</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="select">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={closeForm} className="btn-secondary flex-1 justify-center">বাতিল</button>
              <button onClick={handleSubmit} disabled={creating || updating || !form.nameBn} className="btn-primary flex-1 justify-center">
                {(creating || updating) ? <Loader2 className="w-4 h-4 animate-spin" /> : editItem ? 'আপডেট' : 'তৈরি করুন'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog message="এই পণ্যটি স্থায়ীভাবে মুছে যাবে।" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
      )}
    </div>
  );
}
