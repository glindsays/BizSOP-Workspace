import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

def create_pdf(filename, title, content_pages):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50
    )
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        spaceAfter=15,
        textColor='#1E3A8A'
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=8,
        textColor='#1F2937'
    )
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontSize=10,
        leading=15,
        spaceAfter=8,
        alignment=4 # Justify
    )

    story = []
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 10))

    for page_idx, page_content in enumerate(content_pages):
        if page_idx > 0:
            story.append(PageBreak())
            story.append(Paragraph(f"{title} (Lanjutan)", ParagraphStyle('SubTitle', parent=title_style, fontSize=14)))
            story.append(Spacer(1, 10))
            
        for block in page_content:
            if block['type'] == 'heading':
                story.append(Paragraph(block['text'], heading_style))
            elif block['type'] == 'paragraph':
                story.append(Paragraph(block['text'], body_style))
            story.append(Spacer(1, 4))
            
    doc.build(story)


# 1. SOP Cuti & Izin Karyawan (HR)
sop_cuti = [
    # Halaman 1: Tujuan, Ruang Lingkup, dan Definisi
    [
        {"type": "heading", "text": "BAB I: TUJUAN DAN RUANG LINGKUP"},
        {"type": "paragraph", "text": "Pasal 1: Standar Operasional Prosedur (SOP) ini diterbitkan dengan tujuan untuk mengatur tata cara pengajuan, proses persetujuan, pencatatan, dan pengawasan cuti serta izin bagi seluruh karyawan di lingkungan perusahaan. Hal ini untuk memastikan keseimbangan antara hak kesejahteraan karyawan dan kelancaran operasional bisnis."},
        {"type": "paragraph", "text": "Pasal 2: Ruang lingkup SOP ini berlaku secara menyeluruh (nasional) untuk semua karyawan tetap (Permanent), karyawan kontrak (PKWT), dan masa percobaan (Probation) sesuai dengan proporsi hak masing-masing."},
        {"type": "heading", "text": "BAB II: DEFINISI UMUM"},
        {"type": "paragraph", "text": "1. Cuti: Keadaan tidak masuk kerja yang diizinkan dalam jangka waktu tertentu dan disetujui oleh pihak manajemen berdasarkan undang-undang ketenagakerjaan dan peraturan perusahaan."},
        {"type": "paragraph", "text": "2. HRIS (Human Resource Information System): Sistem portal internal perusahaan yang digunakan untuk merekam seluruh administrasi karyawan termasuk kehadiran dan cuti."},
        {"type": "paragraph", "text": "3. Hari Kerja: Hari operasional perusahaan (Senin hingga Jumat, tidak termasuk hari libur nasional atau cuti bersama yang ditetapkan pemerintah)."}
    ],
    # Halaman 2: Cuti Tahunan dan Ketentuan Hangus (Forfeited)
    [
        {"type": "heading", "text": "BAB III: KETENTUAN CUTI TAHUNAN"},
        {"type": "paragraph", "text": "Pasal 3: Setiap karyawan berhak atas Cuti Tahunan sebanyak 12 (dua belas) hari kerja setelah menempuh masa kerja minimal 12 (dua belas) bulan secara berturut-turut. Bagi karyawan dengan masa kerja di atas 5 tahun, perusahaan memberikan tambahan cuti loyalitas sebanyak 2 (dua) hari kerja per tahun."},
        {"type": "paragraph", "text": "Pasal 4: Siklus perhitungan cuti tahunan didasarkan pada tahun kalender berjalan (1 Januari hingga 31 Desember). Karyawan baru yang masuk di pertengahan tahun akan mendapatkan kuota prorata di tahun berikutnya."},
        {"type": "paragraph", "text": "Pasal 5: Sisa kuota Cuti Tahunan yang tidak digunakan hingga tanggal 31 Desember pada tahun berjalan, maksimal hanya dapat diakumulasikan (carry-over) sebanyak 3 hari ke tahun kalender berikutnya."},
        {"type": "paragraph", "text": "Pasal 6: Sisa cuti carry-over tersebut wajib dihabiskan selambat-lambatnya pada tanggal 31 Maret di tahun berikutnya. Sisa lebih dari 3 hari, atau sisa carry-over yang tidak dipakai melewati tenggat waktu, akan otomatis hangus (forfeited) dan tidak dapat diuangkan (no encashment)."}
    ],
    # Halaman 3: Cuti Sakit dan Rawat Inap
    [
        {"type": "heading", "text": "BAB IV: CUTI SAKIT DAN PERAWATAN MEDIS"},
        {"type": "paragraph", "text": "Pasal 7: Karyawan yang tidak dapat bekerja karena sakit selama 1 (satu) hari kerja wajib memberikan notifikasi lisan/pesan tertulis kepada Atasan Langsung paling lambat pukul 09:00 WIB di hari tersebut."},
        {"type": "paragraph", "text": "Pasal 8: Cuti Sakit yang memakan waktu 2 (dua) hari kerja atau lebih secara berturut-turut WAJIB menyertakan Surat Keterangan Dokter asli (atau digital resmi). Surat wajib diunggah ke HRIS maksimal 2x24 jam setelah karyawan kembali bekerja."},
        {"type": "paragraph", "text": "Pasal 9: Perawatan Inap (Opname). Karyawan yang harus menjalani rawat inap akan mendapatkan Cuti Sakit Berbayar (Paid Sick Leave) penuh hingga maksimal 4 (empat) bulan pertama sesuai ketentuan UU Ketenagakerjaan. Setelah bulan ke-4, persentase upah akan disesuaikan sesuai regulasi."},
        {"type": "paragraph", "text": "Pasal 10: Perusahaan berhak melakukan verifikasi ke instansi medis terkait jika ditemukan kejanggalan pada Surat Keterangan Dokter yang dilampirkan oleh karyawan."}
    ],
    # Halaman 4: Cuti Melahirkan dan Gugur Kandungan
    [
        {"type": "heading", "text": "BAB V: CUTI MELAHIRKAN DAN GUGUR KANDUNGAN"},
        {"type": "paragraph", "text": "Pasal 11: Karyawan perempuan berhak atas Cuti Melahirkan berbayar (Paid Maternity Leave) selama total 3 (tiga) bulan. Distribusi standar adalah 1,5 bulan sebelum hari perkiraan lahir (HPL) dan 1,5 bulan setelah melahirkan."},
        {"type": "paragraph", "text": "Pasal 12: Pengajuan Cuti Melahirkan wajib dilakukan maksimal 1 (satu) bulan sebelum HPL dan dilengkapi dengan surat rekomendasi/keterangan dari dokter kandungan atau bidan."},
        {"type": "paragraph", "text": "Pasal 13: Karyawan perempuan yang mengalami keguguran kandungan berhak memperoleh waktu istirahat (Cuti Keguguran) selama 1,5 (satu setengah) bulan atau sesuai dengan surat keterangan dokter kandungan."},
        {"type": "paragraph", "text": "Pasal 14: Karyawan laki-laki berhak atas Cuti Paternity (Istri Melahirkan/Keguguran) selama 2 (dua) hari kerja berbayar dan tidak memotong kuota Cuti Tahunan."}
    ],
    # Halaman 5: Cuti Alasan Penting / Duka Cita
    [
        {"type": "heading", "text": "BAB VI: CUTI ALASAN PENTING DAN DUKA CITA (PAID LEAVE)"},
        {"type": "paragraph", "text": "Pasal 15: Perusahaan memberikan izin cuti berbayar tanpa memotong Cuti Tahunan untuk keperluan penting berikut dengan rincian hari kerja:"},
        {"type": "paragraph", "text": "a. Karyawan menikah: 3 (tiga) hari kerja."},
        {"type": "paragraph", "text": "b. Menikahkan anak karyawan: 2 (dua) hari kerja."},
        {"type": "paragraph", "text": "c. Mengkhitankan atau membaptiskan anak: 2 (dua) hari kerja."},
        {"type": "paragraph", "text": "d. Anggota keluarga inti (Suami/Istri, Anak kandung, Orang tua kandung, Mertua) meninggal dunia: 2 (dua) hari kerja."},
        {"type": "paragraph", "text": "e. Anggota keluarga dalam satu rumah meninggal dunia: 1 (satu) hari kerja."},
        {"type": "paragraph", "text": "Pasal 16: Dokumen pendukung untuk Cuti Alasan Penting (misal: fotokopi akta nikah, surat keterangan kematian) wajib diunggah ke HRIS dalam waktu selambat-lambatnya 5 hari kerja setelah karyawan kembali bekerja."}
    ],
    # Halaman 6: Cuti Di Luar Tanggungan (Unpaid Leave)
    [
        {"type": "heading", "text": "BAB VII: CUTI DI LUAR TANGGUNGAN (UNPAID LEAVE)"},
        {"type": "paragraph", "text": "Pasal 17: Cuti di Luar Tanggungan Perusahaan (Unpaid Leave) hanya dapat diajukan jika kuota Cuti Tahunan karyawan sudah habis dan terdapat urgensi pribadi yang tidak bisa dihindari."},
        {"type": "paragraph", "text": "Pasal 18: Pengajuan Unpaid Leave wajib mendapatkan persetujuan berlapis dari Atasan Langsung (Manager), Head of Department (VP/Director), dan Divisi HRD."},
        {"type": "paragraph", "text": "Pasal 19: Konsekuensi Unpaid Leave: Selama masa cuti ini, karyawan tidak akan menerima gaji pokok, tunjangan transportasi, tunjangan makan, dan perhitungan prorata THR akan disesuaikan secara proporsional."},
        {"type": "paragraph", "text": "Pasal 20: Maksimal durasi Unpaid Leave yang dapat disetujui dalam satu tahun kalender adalah 30 (tiga puluh) hari kalender. Melebihi waktu tersebut, perusahaan berhak melakukan evaluasi status kepegawaian."}
    ],
    # Halaman 7: Prosedur Pengajuan & SLA Persetujuan
    [
        {"type": "heading", "text": "BAB VIII: ALUR PROSEDUR DAN SLA PENGAJUAN (FLOW)"},
        {"type": "paragraph", "text": "Langkah 1: Karyawan wajib mengajukan cuti melalui portal HRIS minimal 7 (tujuh) hari kerja sebelum pelaksanaan cuti tahunan, atau H+1 untuk cuti darurat (sakit/duka)."},
        {"type": "paragraph", "text": "Langkah 2: Karyawan mengisi form yang memuat Jenis Cuti, Tanggal Pelaksanaan, Catatan Pekerjaan, dan menunjuk 1 (satu) orang rekan sebagai Handover Person (PIC Pengganti)."},
        {"type": "paragraph", "text": "Langkah 3: Atasan Langsung (Manager) memiliki Service Level Agreement (SLA) maksimal 2x24 jam kerja untuk menyetujui (Approve) atau menolak (Reject) pengajuan di sistem. Jika ditolak, Manager wajib memberikan alasan tertulis di HRIS."},
        {"type": "paragraph", "text": "Langkah 4: Setelah Manager menyetujui, HRIS akan memotong saldo cuti secara otomatis. Tim Payroll akan mengacu pada data ini untuk kalkulasi pemotongan gaji (jika terdapat status Unpaid Leave)."}
    ],
    # Halaman 8: Sanksi, Pelanggaran, dan Penutup
    [
        {"type": "heading", "text": "BAB IX: SANKSI DAN PELANGGARAN"},
        {"type": "paragraph", "text": "Pasal 21: Karyawan yang mangkir kerja tanpa pengajuan cuti resmi dan tanpa pemberitahuan sama sekali (AWOL - Absence Without Official Leave) selama 3 (tiga) hari kerja berturut-turut akan diklasifikasikan sebagai pengunduran diri sepihak sesuai hukum ketenagakerjaan."},
        {"type": "paragraph", "text": "Pasal 22: Memalsukan dokumen pendukung (misal: Surat Dokter palsu, Akta Kematian palsu) dikategorikan sebagai pelanggaran berat (Fraud) yang dapat berujung pada Pemutusan Hubungan Kerja (PHK) seketika tanpa peringatan."},
        {"type": "heading", "text": "BAB X: PENUTUP"},
        {"type": "paragraph", "text": "Pasal 23: SOP ini berlaku efektif sejak tanggal ditandatangani dan menggantikan seluruh kebijakan cuti internal versi sebelumnya."},
        {"type": "paragraph", "text": "Pasal 24: Manajemen berhak meninjau dan mengubah kebijakan ini sewaktu-waktu sesuai dengan perubahan regulasi pemerintah atau kondisi finansial perusahaan. Segala perubahan akan disosialisasikan minimal 14 hari sebelum efektif."},
        {"type": "paragraph", "text": "Disahkan oleh: CHRO (Chief Human Resources Officer) & Direktur Utama."}
    ]
]

# 2. SOP Deployment Server Production (IT/DevOps)
sop_deployment = [
    [
        {"type": "heading", "text": "BAB I: PENDAHULUAN"},
        {"type": "paragraph", "text": "Dokumen ini menetapkan standar prosedur eksekusi pembaruan aplikasi (deployment) ke lingkungan Production. Tujuannya adalah untuk menjamin stabilitas sistem (zero downtime target), meminimalisir bug kritis di tahap operasional, dan menetapkan langkah-langkah mitigasi jika terjadi kegagalan sistem."},
        {"type": "heading", "text": "BAB II: PRASYARAT DEPLOYMENT (PRE-RELEASE)"},
        {"type": "paragraph", "text": "1. Kode program (source code) wajib telah melalui tahap Code Review oleh minimal 1 (satu) Senior/Lead Engineer di platform GitHub atau GitLab."},
        {"type": "paragraph", "text": "2. Seluruh Unit Test dan Integration Test pada pipeline CI/CD harus berstatus Passed (Green Build)."},
        {"type": "paragraph", "text": "3. Tim QA (Quality Assurance) telah menyelesaikan User Acceptance Testing (UAT) di lingkungan Staging dan memberikan dokumen 'Sign-Off'."},
        {"type": "paragraph", "text": "4. Tidak ada tiket blocker atau critical bug yang masih berstatus 'Open' di sistem Jira untuk sprint tersebut."}
    ],
    [
        {"type": "heading", "text": "BAB III: PROSEDUR BACKUP DATA (WAJIB)"},
        {"type": "paragraph", "text": "Langkah 1: DevOps Engineer masuk ke dashboard Supabase (atau AWS RDS) pada lingkungan Production."},
        {"type": "paragraph", "text": "Langkah 2: Lakukan eksekusi 'Manual Snapshot Backup' pada basis data utama. Berikan nama file snapshot dengan format: YYYY-MM-DD_Release_vX.X."},
        {"type": "paragraph", "text": "Langkah 3: DevOps Engineer memastikan ukuran file backup wajar dan statusnya tercatat sebagai 'Completed' sebelum melanjutkan proses selanjutnya."},
        {"type": "heading", "text": "BAB IV: EKSEKUSI DEPLOYMENT"},
        {"type": "paragraph", "text": "Langkah 4: Eksekusi deployment wajib dilakukan pada jendela pemeliharaan (Maintenance Window), yakni antara pukul 23:00 WIB hingga 02:00 WIB untuk meminimalisir dampak pada pengguna aktif."},
        {"type": "paragraph", "text": "Langkah 5: DevOps Engineer menjalankan pipeline 'Deploy to Production' melalui GitHub Actions atau Vercel Dashboard."}
    ],
    [
        {"type": "heading", "text": "BAB IV: EKSEKUSI DEPLOYMENT (Lanjutan)"},
        {"type": "paragraph", "text": "Langkah 6: Jika ada perubahan skema database (migration), jalankan skrip SQL migrasi menggunakan alat standar seperti Prisma atau Alembic secara berurutan."},
        {"type": "paragraph", "text": "Langkah 7: Setelah deployment sukses secara log, sistem akan mengirimkan notifikasi via Slack ke kanal #deployment-alerts."},
        {"type": "heading", "text": "BAB V: POST-DEPLOYMENT & ROLLBACK"},
        {"type": "paragraph", "text": "Langkah 8: Tim QA langsung melakukan Smoke Testing pada Production selama maksimal 15 menit. Pengujian mencakup fitur login, transaksi pembayaran, dan pengiriman email."},
        {"type": "paragraph", "text": "Langkah 9: Jika Smoke Testing berhasil, Lead Engineer merilis pengumuman 'Deployment Successful' di kanal tim internal."},
        {"type": "paragraph", "text": "Langkah 10: [PROSEDUR ROLLBACK] Jika tim QA menemukan bug berstatus Blocker/Critical yang merusak aliran utama (main flow) pengguna, DevOps Engineer WAJIB memicu skrip 'Revert Commit' ke versi tag sebelumnya selambat-lambatnya 10 menit sejak masalah ditemukan."}
    ]
]

# 3. SOP Pengajuan Reimbursement Operational (Finance) - 10 Halaman
sop_reimbursement = [
    # Halaman 1: Tujuan dan Ruang Lingkup
    [
        {"type": "heading", "text": "BAB I: TUJUAN DAN RUANG LINGKUP"},
        {"type": "paragraph", "text": "Pasal 1: Standar Operasional Prosedur (SOP) ini dibuat dengan tujuan untuk memberikan panduan yang jelas, transparan, dan terstandarisasi terkait tata cara klaim penggantian dana (reimbursement) atas pengeluaran pribadi karyawan yang digunakan demi kepentingan operasional dan bisnis perusahaan."},
        {"type": "paragraph", "text": "Pasal 2: SOP ini bertujuan untuk menjaga efisiensi anggaran perusahaan, mencegah terjadinya kecurangan (fraud), dan memastikan bahwa setiap pengeluaran telah melalui proses otorisasi yang sah sesuai dengan kebijakan keuangan perusahaan."},
        {"type": "paragraph", "text": "Pasal 3: Ruang lingkup SOP ini berlaku bagi seluruh karyawan tetap, karyawan kontrak, maupun pihak ketiga (konsultan/freelancer) yang secara resmi ditugaskan oleh manajemen perusahaan untuk menjalankan kegiatan bisnis operasional."}
    ],
    # Halaman 2: Ketentuan Umum dan Definisi
    [
        {"type": "heading", "text": "BAB II: DEFINISI DAN KETENTUAN UMUM"},
        {"type": "paragraph", "text": "Pasal 4: Reimbursement adalah proses penggantian uang pribadi karyawan oleh perusahaan setelah karyawan tersebut melakukan pengeluaran yang diotorisasi untuk keperluan perusahaan, dengan melampirkan bukti transaksi yang sah."},
        {"type": "paragraph", "text": "Pasal 5: ERP/Finance System adalah portal digital internal perusahaan yang wajib digunakan oleh karyawan untuk mengunggah bukti pengajuan klaim biaya dan memantau status tiket pengajuannya."},
        {"type": "paragraph", "text": "Pasal 6: Prinsip Kehati-hatian (Prudent Principle): Setiap pengeluaran harus dilakukan secara wajar, tidak berlebihan, dan murni untuk kepentingan perusahaan tanpa adanya unsur kepentingan pribadi karyawan."},
        {"type": "paragraph", "text": "Pasal 7: Batas Waktu Pengajuan: Klaim reimbursement wajib diajukan maksimal 30 (tiga puluh) hari kalender setelah tanggal transaksi yang tertera pada bukti pembayaran. Keterlambatan pengajuan akan mengakibatkan klaim ditolak secara otomatis oleh sistem, kecuali terdapat izin khusus dari jajaran Direksi."}
    ],
    # Halaman 3: Jenis Pengeluaran yang Diizinkan - Bagian 1
    [
        {"type": "heading", "text": "BAB III: KATEGORI PENGELUARAN YANG DIIZINKAN (REIMBURSABLE)"},
        {"type": "paragraph", "text": "Pasal 8: Biaya Perjalanan Dinas (Business Travel). Meliputi tiket pesawat kelas ekonomi, kereta api, atau bus antar kota yang telah disetujui sebelumnya melalui Surat Perintah Perjalanan Dinas (SPPD). Penambahan bagasi berbayar diizinkan khusus untuk pengangkutan sampel produk atau alat peraga."},
        {"type": "paragraph", "text": "Pasal 9: Biaya Akomodasi/Hotel. Penginapan standar bisnis yang sesuai dengan pagu anggaran (rate) masing-masing tingkatan jabatan (grade) karyawan. Tambahan layanan kamar (room service) berupa minibar, spa, atau laundry pribadi tidak ditanggung dan akan dipotong dari nilai klaim."},
        {"type": "paragraph", "text": "Pasal 10: Transportasi Lokal. Meliputi biaya taksi, layanan ride-hailing (seperti Grab/Gojek), atau biaya bahan bakar kendaraan operasional untuk kunjungan ke kantor klien atau lokasi survei proyek."},
        {"type": "paragraph", "text": "Pasal 11: Biaya Tol dan Parkir. Harus disertai dengan struk resmi dari gerbang tol atau karcis parkir ber-barcode yang menunjukkan durasi serta tarif yang valid."}
    ],
    # Halaman 4: Jenis Pengeluaran yang Diizinkan - Bagian 2
    [
        {"type": "heading", "text": "BAB IV: KATEGORI PENGELUARAN DIIZINKAN (LANJUTAN)"},
        {"type": "paragraph", "text": "Pasal 12: Konsumsi dan Jamuan Klien (Client Entertainment). Pengeluaran untuk menjamu klien (makan siang/makan malam) diizinkan selama karyawan menyertakan daftar nama klien, nama instansi, serta hasil/tujuan pertemuan secara rinci di dalam kolom deskripsi sistem ERP."},
        {"type": "paragraph", "text": "Pasal 13: Biaya Telekomunikasi. Pembelian pulsa atau paket data darurat (di luar tunjangan komunikasi bulanan) yang secara langsung digunakan untuk menunjang penyelesaian proyek di luar jam kerja (overtime support)."},
        {"type": "paragraph", "text": "Pasal 14: Pembelian Perlengkapan Mendesak (Minor Office Supplies). Pembelian Alat Tulis Kantor (ATK), kabel adaptor, hardisk eksternal, atau lisensi software minor senilai kurang dari Rp 500.000 yang bersifat darurat dan tidak tersedia di gudang logistik perusahaan."},
        {"type": "paragraph", "text": "Pasal 15: Biaya Pengiriman (Courier/Logistics). Pengiriman dokumen rahasia, legalitas, atau prototipe barang kepada klien maupun antar-cabang yang menggunakan layanan kurir kilat resmi."}
    ],
    # Halaman 5: Pengeluaran Tidak Diizinkan
    [
        {"type": "heading", "text": "BAB V: PENGELUARAN YANG TIDAK DIIZINKAN (NON-REIMBURSABLE)"},
        {"type": "paragraph", "text": "Pasal 16: Perusahaan secara tegas tidak akan mengganti (menolak) biaya-biaya berikut ini, meskipun terjadi saat jam kerja atau dalam masa perjalanan dinas luar kota:"},
        {"type": "paragraph", "text": "a. Biaya denda atau pelanggaran lalu lintas (tilang), biaya derek kendaraan, serta kelalaian pribadi lainnya di jalan raya."},
        {"type": "paragraph", "text": "b. Pembelian minuman keras (beralkohol), rokok, cerutu, atau produk tembakau lainnya, baik untuk konsumsi pribadi maupun untuk keperluan jamuan klien."},
        {"type": "paragraph", "text": "c. Biaya keanggotaan klub eksklusif, fasilitas kebugaran (gym), spa, salon kecantikan, dan tagihan hiburan malam (karaoke/kelab)."},
        {"type": "paragraph", "text": "d. Biaya perbaikan rutin kendaraan pribadi karyawan (seperti ganti oli, suku cadang), kecuali terdapat surat penugasan khusus penggunaan kendaraan pribadi untuk kegiatan bisnis yang ditetapkan direksi."}
    ],
    # Halaman 6: Plafon Biaya dan Otorisasi
    [
        {"type": "heading", "text": "BAB VI: PLAFON BIAYA (SPENDING LIMITS) DAN OTORISASI"},
        {"type": "paragraph", "text": "Pasal 17: Semua kategori pengeluaran harus menyesuaikan dengan plafon maksimal yang telah ditetapkan oleh Departemen Keuangan (Finance) pada awal tahun fiskal. Daftar pagu (rate) dibedakan berdasarkan level struktural: Staff, Supervisor, Manager, dan Tingkat Direktur."},
        {"type": "paragraph", "text": "Pasal 18: Apabila terdapat pengeluaran tak terhindarkan yang terpaksa melebihi plafon harian (misal: lonjakan drastis harga hotel/pesawat di masa high season), karyawan wajib meminta dan melampirkan bukti persetujuan tertulis (Pre-Approval) dari Head of Department (VP/Director) sebelum transaksi terjadi."},
        {"type": "paragraph", "text": "Pasal 19: Pengeluaran di atas batas plafon tanpa melampirkan Pre-Approval hanya akan diganti senilai batas maksimal plafon. Sisa selisih kelebihan biaya otomatis menjadi tanggung jawab penuh karyawan yang bersangkutan."}
    ],
    # Halaman 7: Syarat Dokumen Bukti Transaksi
    [
        {"type": "heading", "text": "BAB VII: SYARAT DOKUMEN DAN BUKTI TRANSAKSI"},
        {"type": "paragraph", "text": "Pasal 20: Klaim hanya diproses jika disertai bukti transaksi fisik atau digital (e-receipt) yang sah dan dapat dibuktikan kebenarannya ke pihak merchant penerbit."},
        {"type": "paragraph", "text": "Pasal 21: Syarat kuitansi yang sah meliputi: adanya logo/nama merchant, tanggal transaksi yang jelas, rincian barang/jasa, nominal total pembayaran, dan stempel/cap toko (untuk kuitansi/nota yang diterbitkan secara manual)."},
        {"type": "paragraph", "text": "Pasal 22: Nota kosong, bon tulis tangan tanpa rincian, atau bon tanpa stempel/tanda tangan merchant tidak dianggap valid dan akan langsung di-reject (ditolak)."},
        {"type": "paragraph", "text": "Pasal 23: Untuk struk yang menggunakan cetakan kertas thermal (struk mudah pudar), karyawan diwajibkan segera memfoto atau memindai (scan) struk tersebut saat masih baru agar tulisan tetap terbaca oleh tim Finance di sistem ERP."},
        {"type": "paragraph", "text": "Pasal 24: Karyawan dilarang keras melakukan rekayasa seperti menambal (tipe-x), mencoret, atau memodifikasi angka dan tanggal yang tertera pada dokumen struk asli."}
    ],
    # Halaman 8: Alur Pengajuan Klaim
    [
        {"type": "heading", "text": "BAB VIII: ALUR PROSEDUR PENGAJUAN KLAIM (FLOW)"},
        {"type": "paragraph", "text": "Langkah 1: Karyawan merapikan dan memfoto atau melakukan pemindaian (scan) bukti transaksi dengan pencahayaan yang cukup, memastikan tulisan dan angka tidak buram atau terpotong."},
        {"type": "paragraph", "text": "Langkah 2: Karyawan login ke portal ERP / Finance internal, menavigasi ke menu 'Expense Claim', lalu memilih tombol 'Create New Claim'."},
        {"type": "paragraph", "text": "Langkah 3: Karyawan mengisi formulir digital dengan teliti yang mencakup: Tanggal Transaksi, Nama Merchant, Kategori Biaya, Nominal Persis Sesuai Struk, dan Tujuan Pengeluaran/Nama Klien yang bersangkutan."},
        {"type": "paragraph", "text": "Langkah 4: Karyawan mengunggah lampiran fail bukti foto transaksi, dokumen pendukung tambahan (seperti dokumen SPPD atau email persetujuan VP jika melebihi plafon), lalu menyimpannya sebagai Draf."},
        {"type": "paragraph", "text": "Langkah 5: Karyawan menekan tombol 'Submit'. Sistem secara otomatis mengunci perubahan dan mendistribusikan tiket pengajuan ke antrean persetujuan (approval routing) Manager yang bersangkutan."}
    ],
    # Halaman 9: Verifikasi, Pengecualian, dan SLA Pencairan
    [
        {"type": "heading", "text": "BAB IX: PROSES VERIFIKASI DAN PENCAIRAN DANA"},
        {"type": "paragraph", "text": "Langkah 6: Atasan Langsung (Manager) memvalidasi kesesuaian dan urgensi operasional dari pengeluaran tersebut selambat-lambatnya 2x24 jam kerja. Jika disetujui (Approve), tiket akan diteruskan otomatis ke antrean Finance Admin."},
        {"type": "paragraph", "text": "Langkah 7: Finance Admin memverifikasi keabsahan dokumen fisik/digital, memastikan ketaatan terhadap aturan plafon biaya, serta mencocokkan silang untuk menjamin tidak ada pengajuan ganda (duplicate claim) untuk satu transaksi."},
        {"type": "paragraph", "text": "Langkah 8: Apabila dokumen tidak valid atau kuitansi buram, Finance Admin berhak menekan tombol 'Return', yang mengembalikan tiket kepada karyawan dengan catatan revisi wajib."},
        {"type": "paragraph", "text": "Langkah 9: Tiket klaim yang lolos tahap audit verifikator akan diajukan untuk mendapatkan persetujuan akhir (Final Approval) dari Finance Manager."},
        {"type": "paragraph", "text": "Langkah 10: Service Level Agreement (SLA) untuk pencairan dana (pembayaran) adalah selambat-lambatnya 5 (lima) hari kerja sejak dokumen mendapat persetujuan akhir. Dana akan ditransfer melalui jaringan antarbank (LLG/RTGS) ke nomor rekening terdaftar karyawan untuk penerimaan gaji (payroll)."}
    ],
    # Halaman 10: Sanksi, Fraud, dan Penutup
    [
        {"type": "heading", "text": "BAB X: SANKSI DAN PELANGGARAN KLAIM (FRAUD)"},
        {"type": "paragraph", "text": "Pasal 25: Segala bentuk manipulasi seperti pemalsuan bukti transaksi, penggelembungan tagihan (mark-up), pengajuan klaim fiktif, hingga pengajuan bukti yang sama ke dua departemen berbeda diklasifikasikan sebagai pelanggaran etika kelas berat (Corporate Fraud)."},
        {"type": "paragraph", "text": "Pasal 26: Karyawan yang terbukti berdasarkan hasil audit melakukan kecurangan (fraud) akan dikenakan sanksi Pemutusan Hubungan Kerja (PHK) secara tidak hormat tanpa pesangon, wajib mengembalikan 100% dana kerugian perusahaan, serta berpotensi diproses ke pihak berwajib melalui jalur hukum perdata atau pidana."},
        {"type": "heading", "text": "BAB XI: PENUTUP"},
        {"type": "paragraph", "text": "Pasal 27: Tim internal Audit dan Finance berhak meninjau ulang dan melakukan inspeksi acak (spot check) mendalam terhadap riwayat klaim yang telah dibayarkan tanpa pemberitahuan sebelumnya."},
        {"type": "paragraph", "text": "Pasal 28: SOP Reimbursement ini mulai berlaku efektif sejak disahkan dan diterbitkan di sistem Knowledge Base internal, menggantikan seluruh prosedur maupun kebiasaan klaim versi sebelumnya."},
        {"type": "paragraph", "text": "Disahkan dan ditetapkan oleh: Chief Financial Officer (CFO) dan Direktur Kepatuhan (Compliance Director)."}
    ]
]

if __name__ == "__main__":
    output_dir = "dummy_sops"
    os.makedirs(output_dir, exist_ok=True)

    create_pdf(os.path.join(output_dir, "SOP_Cuti_Karyawan.pdf"), "SOP CUTI DAN IZIN KARYAWAN", sop_cuti)
    create_pdf(os.path.join(output_dir, "SOP_Deployment_Server.pdf"), "SOP DEPLOYMENT SERVER PRODUCTION", sop_deployment)
    create_pdf(os.path.join(output_dir, "SOP_Reimbursement.pdf"), "SOP REIMBURSEMENT OPERASIONAL", sop_reimbursement)
