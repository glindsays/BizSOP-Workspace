// 'use client';

// import React, { useRef, useState } from 'react';
// import { Upload, Loader2, AlertCircle, Lock, FileText, CheckCircle2, Info } from 'lucide-react';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Button } from '@/components/ui/button';
// import { useApp } from '@/lib/app-context';
// import { DocumentItem, getErrorMessage, uploadDocument } from '@/lib/api';

// const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// interface Props {
//   scope: string[]; // kosong = semua dokumen (data lama)
//   onChange: (next: string[]) => void;
//   disabled?: boolean;
//   locked?: boolean; // percakapan sudah berjalan: dokumen terpakai tidak bisa dilepas, hanya ditambah
// }

// const isReady = (d: DocumentItem) => !d.status || d.status === 'ready';

// export function DocumentPicker({ scope, onChange, disabled, locked = false }: Props) {
//   const { documents, refresh } = useApp();
//   const inputRef = useRef<HTMLInputElement>(null);
//   const [uploading, setUploading] = useState(false);
//   const [isDragging, setIsDragging] = useState(false);
//   const [errors, setErrors] = useState<string[]>([]);

//   const readyDocs = documents.filter(isReady);
//   const allIds = readyDocs.map((d) => d.id);
//   const isAll = scope.length === 0;
//   const isChecked = (id: string) => isAll || scope.includes(id);
//   const isLockedDoc = (id: string) => locked && isChecked(id);

//   // Hitung jumlah dokumen yang sedang aktif terpilih
//   const selectedCount = isAll ? readyDocs.length : scope.filter(id => allIds.includes(id)).length;

//   const toggle = (id: string) => {
//     if (isLockedDoc(id)) return;
//     const current = isAll ? allIds : scope;
//     const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
//     if (next.length === 0) return; // minimal satu dokumen
//     onChange(next);
//   };

//   const handleFiles = async (list?: FileList | null) => {
//     if (!list || list.length === 0) return;
//     setUploading(true);
//     setErrors([]);

//     const problems: string[] = [];
//     const uploadedIds: string[] = [];
//     const knownNames = new Set(documents.map((d) => d.file_name.toLowerCase()));

//     for (const file of Array.from(list)) {
//       if (!file.name.toLowerCase().endsWith('.pdf')) {
//         problems.push(`${file.name}: hanya file PDF yang didukung.`);
//         continue;
//       }
//       if (file.size > MAX_FILE_SIZE) {
//         problems.push(`${file.name}: melebihi batas 10 MB.`);
//         continue;
//       }
//       if (knownNames.has(file.name.toLowerCase())) {
//         problems.push(`${file.name}: nama file sudah ada, dilewati.`);
//         continue;
//       }
//       try {
//         const res = await uploadDocument(file);
//         uploadedIds.push(res.document_id);
//         knownNames.add(file.name.toLowerCase());
//         await refresh();
//       } catch (err) {
//         problems.push(`${file.name}: ${getErrorMessage(err, 'gagal diunggah.')}`);
//       }
//     }

//     if (uploadedIds.length > 0 && !(locked && isAll)) {
//       const base = isAll ? allIds : scope;
//       onChange(Array.from(new Set([...base, ...uploadedIds])));
//     }

//     setErrors(problems);
//     setUploading(false);
//     if (inputRef.current) inputRef.current.value = '';
//   };

//   // Drag and drop handlers
//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     if (!disabled && !uploading) setIsDragging(true);
//   };

//   const handleDragLeave = () => {
//     setIsDragging(false);
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(false);
//     if (disabled || uploading) return;
//     handleFiles(e.dataTransfer.files);
//   };

//   return (
//     <div className="border-b bg-slate-50/80 backdrop-blur-sm p-4 space-y-3 text-sm">
//       {/* Header Info & Select All */}
//       <div className="flex items-start justify-between gap-2">
//         <div>
//           <div className="flex items-center gap-1.5 font-medium text-slate-700">
//             <span>Sumber Dokumen Referensi</span>
//             <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
//               {selectedCount} aktif
//             </span>
//           </div>
//           <p className="text-xs text-slate-500 mt-0.5">
//             {locked
//               ? 'Dokumen terdahulu terkunci agar riwayat konsisten. Anda dapat menambahkan dokumen baru.'
//               : 'Pilih dokumen PDF yang akan menjadi basis pengetahuan chat ini.'}
//           </p>
//         </div>
//         {!locked && readyDocs.length > 1 && (
//           <button
//             type="button"
//             onClick={() => onChange(allIds)}
//             disabled={disabled}
//             className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50 mt-0.5"
//           >
//             Pilih Semua
//           </button>
//         )}
//       </div>

//       {/* Document List Container */}
//       <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
//         {documents.length === 0 && (
//           <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
//             <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
//             <p className="text-xs font-medium text-slate-600">Belum ada dokumen tersedia</p>
//             <p className="text-[11px] text-slate-400 mt-0.5">Unggah file PDF SOP untuk mulai menggunakan asisten AI.</p>
//           </div>
//         )}

//         {documents.map((doc) => {
//           const ready = isReady(doc);
//           const lockedDoc = isLockedDoc(doc.id);
//           const interactive = ready && !lockedDoc;
//           const checked = ready && isChecked(doc.id);

//           return (
//             <div
//               key={doc.id}
//               onClick={() => interactive && !disabled && toggle(doc.id)}
//               className={`group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all duration-150 ${
//                 checked
//                   ? 'border-indigo-200 bg-indigo-50/40 shadow-2xs'
//                   : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
//               } ${!interactive ? 'opacity-75 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
//               title={doc.status === 'failed' ? doc.error_message ?? 'Pengindeksan gagal' : doc.file_name}
//             >
//               <div className="flex items-center gap-3 min-w-0 flex-1">
//                 <Checkbox
//                   checked={checked}
//                   onCheckedChange={() => interactive && toggle(doc.id)}
//                   disabled={disabled || !interactive}
//                   className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
//                 />
//                 <FileText className={`h-4 w-4 shrink-0 ${checked ? 'text-indigo-600' : 'text-slate-400'}`} />
//                 <div className="min-w-0 flex-1">
//                   <p className={`text-xs font-medium truncate ${checked ? 'text-indigo-950 font-semibold' : 'text-slate-700'}`}>
//                     {doc.file_name}
//                   </p>
//                   <p className="text-[10px] text-slate-400">
//                     {new Date(doc.created_at).toLocaleDateString('id-ID', {
//                       day: 'numeric',
//                       month: 'short',
//                       year: 'numeric',
//                     })}
//                   </p>
//                 </div>
//               </div>

//               {/* Status / Lock Badges */}
//               <div className="flex items-center gap-1.5 shrink-0">
//                 {lockedDoc && (
//                   <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md" title="Terkunci untuk percakapan ini">
//                     <Lock className="h-3 w-3" /> Terkunci
//                   </span>
//                 )}
//                 {doc.status === 'processing' && (
//                   <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
//                     <Loader2 className="h-3 w-3 animate-spin" /> Mengindeks
//                   </span>
//                 )}
//                 {doc.status === 'failed' && (
//                   <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[10px] font-medium text-red-700">
//                     Gagal
//                   </span>
//                 )}
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Upload Zone (Drag & Drop + Button) */}
//       <input
//         ref={inputRef}
//         type="file"
//         accept=".pdf,application/pdf"
//         multiple
//         className="hidden"
//         onChange={(e) => handleFiles(e.target.files)}
//       />

//       {/* <div
//         onDragOver={handleDragOver}
//         onDragLeave={handleDragLeave}
//         onDrop={handleDrop}
//         onClick={() => !uploading && !disabled && inputRef.current?.click()}
//         className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition-all cursor-pointer ${
//           isDragging
//             ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
//             : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
//         } ${uploading || disabled ? 'opacity-60 cursor-wait' : ''}`}
//       >
//         {uploading ? (
//           <div className="flex items-center gap-2 py-1 text-xs font-medium text-indigo-600">
//             <Loader2 className="w-4 h-4 animate-spin" />
//             <span>Mengunggah dan mengindeks PDF...</span>
//           </div>
//         ) : (
//           <div className="flex items-center justify-between w-full px-1">
//             <div className="flex items-center gap-2.5 text-left">
//               <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
//                 <Upload className="w-4 h-4" />
//               </div>
//               <div>
//                 <p className="text-xs font-semibold text-slate-700">
//                   Unggah PDF Baru <span className="font-normal text-slate-400">(atau seret ke sini)</span>
//                 </p>
//                 <p className="text-[10px] text-slate-400">Format PDF, maks. 10 MB per file</p>
//               </div>
//             </div>
//             <Button
//               size="sm"
//               variant="secondary"
//               className="h-7 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 pointer-events-none"
//             >
//               Pilih File
//             </Button>
//           </div>
//         )}
//       </div> */}


// <div
//         onDragOver={handleDragOver}
//         onDragLeave={handleDragLeave}
//         onDrop={handleDrop}
//         onClick={() => !uploading && !disabled && inputRef.current?.click()}
//         className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
//           isDragging
//             ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
//             : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
//         } ${uploading || disabled ? 'opacity-60 cursor-wait' : ''}`}
//       >
//         {uploading ? (
//           <div className="flex flex-col items-center gap-2 py-2 text-xs font-medium text-indigo-600">
//             <Loader2 className="w-5 h-5 animate-spin" />
//             <span>Mengunggah dan mengindeks PDF...</span>
//           </div>
//         ) : (
//           <div className="flex flex-col items-center gap-1.5">
//             <div className="p-2.5 rounded-full bg-indigo-50 text-indigo-600 mb-1">
//               <Upload className="w-4 h-4" />
//             </div>
//             <p className="text-xs font-semibold text-slate-700">
//               Unggah PDF Baru <span className="font-normal text-slate-400">(atau seret ke sini)</span>
//             </p>
//             <p className="text-[10px] text-slate-400">Format PDF, maks. 10 MB per file</p>
//           </div>
//         )}
//       </div>


//       {/* Error Messages */}
//       {errors.length > 0 && (
//         <div className="space-y-1 rounded-lg bg-red-50 p-2.5 border border-red-100">
//           {errors.map((msg, i) => (
//             <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
//               <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {msg}
//             </p>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }



'use client';

import React, { useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle, Lock, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/app-context';
import { DocumentItem, getErrorMessage, uploadDocument } from '@/lib/api';

const MySwal = withReactContent(Swal);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface Props {
  scope: string[]; // kosong = semua dokumen (data lama)
  onChange: (next: string[]) => void;
  disabled?: boolean;
  locked?: boolean; // percakapan sudah berjalan: dokumen terpakai tidak bisa dilepas, hanya ditambah
}

const isReady = (d: DocumentItem) => !d.status || d.status === 'ready';

export function DocumentPicker({ scope, onChange, disabled, locked = false }: Props) {
  const { documents, refresh } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const readyDocs = documents.filter(isReady);
  const allIds = readyDocs.map((d) => d.id);
  const isAll = scope.length === 0;
  const isChecked = (id: string) => isAll || scope.includes(id);
  const isLockedDoc = (id: string) => locked && isChecked(id);

  const selectedCount = isAll ? readyDocs.length : scope.filter(id => allIds.includes(id)).length;

  const toggle = (id: string) => {
    if (isLockedDoc(id)) return;
    const current = isAll ? allIds : scope;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    if (next.length === 0) return; // minimal satu dokumen
    onChange(next);
  };

  const handleFiles = async (list?: FileList | null) => {
    if (!list || list.length === 0) return;
    setErrors([]);

    const problems: string[] = [];
    const uploadedIds: string[] = [];
    const filesToUpload: File[] = [];
    
    // Buat daftar nama file yang sudah ada di sistem (case-insensitive)
    const existingNamesMap = new Map(documents.map((d) => [d.file_name.toLowerCase(), d.file_name]));

    // Validasi awal (format dan ukuran)
    for (const file of Array.from(list)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        problems.push(`${file.name}: hanya file PDF yang didukung.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        problems.push(`${file.name}: melebihi batas 10 MB.`);
        continue;
      }
      filesToUpload.push(file);
    }

    if (filesToUpload.length === 0) {
      setErrors(problems);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Cek duplikasi nama file dengan SweetAlert konfirmasi
    const finalFilesToProcess: File[] = [];
    for (const file of filesToUpload) {
      const fileNameLower = file.name.toLowerCase();
      if (existingNamesMap.has(fileNameLower)) {
        // Tampilkan SweetAlert konfirmasi jika file sudah ada
        const result = await MySwal.fire({
          title: 'File Sudah Ada',
          text: `Dokumen dengan nama "${file.name}" sudah ada di sistem. Apakah Anda tetap ingin mengunggahnya?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#6366f1', // Warna indigo
          cancelButtonColor: '#64748b',  // Warna slate
          confirmButtonText: 'Ya, Tetap Unggah',
          cancelButtonText: 'Batalkan',
          customClass: {
            popup: 'rounded-xl text-sm',
            confirmButton: 'px-4 py-2 text-sm font-medium rounded-lg',
            cancelButton: 'px-4 py-2 text-sm font-medium rounded-lg',
          },
        });

        if (result.isConfirmed) {
          finalFilesToProcess.push(file);
        }
      } else {
        finalFilesToProcess.push(file);
      }
    }

    if (finalFilesToProcess.length === 0) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);

    // Proses unggah file yang disetujui
    for (const file of finalFilesToProcess) {
      try {
        const res = await uploadDocument(file);
        uploadedIds.push(res.document_id);
        await refresh();
      } catch (err) {
        problems.push(`${file.name}: ${getErrorMessage(err, 'gagal diunggah.')}`);
      }
    }

    if (uploadedIds.length > 0 && !(locked && isAll)) {
      const base = isAll ? allIds : scope;
      onChange(Array.from(new Set([...base, ...uploadedIds])));
    }

    setErrors(problems);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="border-b bg-slate-50/80 backdrop-blur-sm p-4 space-y-3 text-sm">
      {/* Header Info & Select All */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span>Sumber Dokumen Referensi</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {selectedCount} aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {locked
              ? 'Dokumen terdahulu terkunci agar riwayat konsisten. Anda dapat menambahkan dokumen baru.'
              : 'Pilih dokumen PDF yang akan menjadi basis pengetahuan chat ini.'}
          </p>
        </div>
        {!locked && readyDocs.length > 1 && (
          <button
            type="button"
            onClick={() => onChange(allIds)}
            disabled={disabled}
            className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50 mt-0.5"
          >
            Pilih Semua
          </button>
        )}
      </div>

      {/* Document List Container */}
      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {documents.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-600">Belum ada dokumen tersedia</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Unggah file PDF SOP untuk mulai menggunakan asisten AI.</p>
          </div>
        )}

        {documents.map((doc) => {
          const ready = isReady(doc);
          const lockedDoc = isLockedDoc(doc.id);
          const interactive = ready && !lockedDoc;
          const checked = ready && isChecked(doc.id);

          return (
            <div
              key={doc.id}
              onClick={() => interactive && !disabled && toggle(doc.id)}
              className={`group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all duration-150 ${
                checked
                  ? 'border-indigo-200 bg-indigo-50/40 shadow-2xs'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              } ${!interactive ? 'opacity-75 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
              title={doc.status === 'failed' ? doc.error_message ?? 'Pengindeksan gagal' : doc.file_name}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => interactive && toggle(doc.id)}
                  disabled={disabled || !interactive}
                  className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                />
                <FileText className={`h-4 w-4 shrink-0 ${checked ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${checked ? 'text-indigo-950 font-semibold' : 'text-slate-700'}`}>
                    {doc.file_name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(doc.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Status / Lock Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {lockedDoc && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md" title="Terkunci untuk percakapan ini">
                    <Lock className="h-3 w-3" /> Terkunci
                  </span>
                )}
                {doc.status === 'processing' && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
                    <Loader2 className="h-3 w-3 animate-spin" /> Mengindeks
                  </span>
                )}
                {doc.status === 'failed' && (
                  <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[10px] font-medium text-red-700">
                    Gagal
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Zone */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
        } ${uploading || disabled ? 'opacity-60 cursor-wait' : ''}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2 text-xs font-medium text-indigo-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Mengunggah dan mengindeks PDF...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className="p-2.5 rounded-full bg-indigo-50 text-indigo-600 mb-1">
              <Upload className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Unggah PDF Baru <span className="font-normal text-slate-400">(atau seret ke sini)</span>
            </p>
            <p className="text-[10px] text-slate-400">Format PDF, maks. 10 MB per file</p>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-1 rounded-lg bg-red-50 p-2.5 border border-red-100">
          {errors.map((msg, i) => (
            <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}