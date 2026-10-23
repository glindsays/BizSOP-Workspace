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
    [
        {"type": "heading", "text": "BAB I: TUJUAN DAN RUANG LINGKUP"},
        {"type": "paragraph", "text": "Pasal 1: Standar Operasional Prosedur (SOP) ini bertujuan untuk mengatur tata cara pengajuan, persetujuan, dan pencatatan cuti serta izin bagi seluruh karyawan tetap maupun kontrak di lingkungan perusahaan."},
        {"type": "paragraph", "text": "Pasal 2: Ruang lingkup SOP ini mencakup Cuti Tahunan, Cuti Sakit, Cuti Melahirkan, dan Cuti Alasan Penting/Duka."},
        {"type": "heading", "text": "BAB II: KETENTUAN UMUM CUTI"},
        {"type": "paragraph", "text": "Pasal 3: Setiap karyawan berhak atas Cuti Tahunan sebanyak 12 (dua belas) hari kerja setelah menempuh masa kerja minimal 12 (dua belas) bulan secara berturut-turut."},
        {"type": "paragraph", "text": "Pasal 4: Sisa kuota Cuti Tahunan yang tidak digunakan hingga tanggal 31 Desember pada tahun berjalan, maksimal hanya dapat diakumulasikan sebanyak 3 hari ke tahun berikutnya. Sisa lebih dari 3 hari akan otomatis hangus (forfeited)."},
        {"type": "paragraph", "text": "Pasal 5: Pengajuan cuti harus diajukan minimal 7 (tujuh) hari kerja sebelum tanggal pelaksanaan cuti melalui sistem HRIS, kecuali untuk kasus darurat (sakit atau duka)."}
    ],
    [
        {"type": "heading", "text": "BAB III: PERAN DAN TANGGUNG JAWAB"},
        {"type": "paragraph", "text": "1. Karyawan (Pemohon): Bertanggung jawab memastikan kuota cuti masih tersedia, menyelesaikan tugas mendesak, dan menunjuk pengganti sementara (handover person)."},
        {"type": "paragraph", "text": "2. Atasan Langsung (Manager): Bertanggung jawab meninjau beban kerja tim, memastikan operasional tidak terganggu, dan memberikan persetujuan (approval) maksimal 2x24 jam setelah pengajuan."},
        {"type": "paragraph", "text": "3. Divisi HRD: Melakukan verifikasi akhir, memotong kuota pada sistem HRIS, dan menyimpan rekam jejak pengajuan untuk keperluan payroll."},
        {"type": "heading", "text": "BAB IV: ALUR PROSEDUR PENGAJUAN CUTI (FLOW)"},
        {"type": "paragraph", "text": "Langkah 1: Karyawan login ke portal internal HRIS dan memilih menu 'Leave Request'."},
        {"type": "paragraph", "text": "Langkah 2: Karyawan mengisi formulir digital yang mencakup: Jenis Cuti, Tanggal Mulai, Tanggal Selesai, Alasan Cuti, dan Nama Rekan Pengganti (Handover)."},
        {"type": "paragraph", "text": "Langkah 3: Sistem HRIS secara otomatis mengirimkan notifikasi persetujuan (approval routing) ke email Atasan Langsung (Manager)."}
    ],
    [
        {"type": "heading", "text": "BAB IV: ALUR PROSEDUR PENGAJUAN CUTI (Lanjutan)"},
        {"type": "paragraph", "text": "Langkah 4: Atasan Langsung meninjau pengajuan. Jika disetujui, Atasan menekan tombol 'Approve'. Jika ditolak (misalnya karena bentrok dengan jadwal rilis proyek), Atasan menekan 'Reject' dan wajib memberikan catatan penolakan."},
        {"type": "paragraph", "text": "Langkah 5: Setelah disetujui Atasan Langsung, pengajuan otomatis diteruskan ke antrean (queue) Divisi HRD."},
        {"type": "paragraph", "text": "Langkah 6: Divisi HRD melakukan validasi akhir terhadap kelengkapan dokumen pendukung (khusus cuti sakit/duka)."},
        {"type": "paragraph", "text": "Langkah 7: Karyawan menerima email konfirmasi final berupa 'Leave Approved', dan saldo cuti di HRIS akan terpotong secara otomatis."},
        {"type": "heading", "text": "BAB V: KETENTUAN KHUSUS (PENYAKIT & DUKA)"},
        {"type": "paragraph", "text": "Pasal 6: Cuti Sakit yang memakan waktu lebih dari 1 (satu) hari kerja wajib menyertakan Surat Keterangan Dokter yang diunggah ke HRIS maksimal 2 hari setelah karyawan kembali bekerja."},
        {"type": "paragraph", "text": "Pasal 7: Karyawan yang mangkir tanpa pemberitahuan resmi selama 3 hari kerja berturut-turut akan dikirimkan Surat Peringatan (SP) Tingkat 3."}
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

# 3. SOP Pengajuan Reimbursement (Finance)
sop_reimbursement = [
    [
        {"type": "heading", "text": "BAB I: KEBIJAKAN UMUM KLAIM PENGELUARAN"},
        {"type": "paragraph", "text": "Pasal 1: SOP ini mengatur prosedur klaim penggantian dana (reimbursement) atas pengeluaran pribadi karyawan yang digunakan untuk kepentingan operasional perusahaan."},
        {"type": "paragraph", "text": "Pasal 2: Kategori pengeluaran yang diizinkan meliputi: Biaya perjalanan dinas (tiket, hotel), transportasi lokal (taksi/ride-hailing untuk ke kantor klien), konsumsi rapat/jamuan klien (entertainment), dan pembelian perlengkapan darurat (ATK/lisensi IT minor)."},
        {"type": "paragraph", "text": "Pasal 3: Seluruh pengeluaran harus berpegang pada prinsip kehati-hatian, relevansi bisnis, dan sesuai dengan batas maksimal anggaran (spending limit) yang ditetapkan perusahaan per level jabatan."},
        {"type": "heading", "text": "BAB II: SYARAT DOKUMEN (BUKTI TRANSAKSI)"}
    ],
    [
        {"type": "heading", "text": "BAB II: SYARAT DOKUMEN (Lanjutan)"},
        {"type": "paragraph", "text": "Pasal 4: Klaim wajib disertai bukti transaksi berupa kuitansi, struk fisik asli yang dicetak mesin, atau e-receipt resmi dari platform digital (misal: Grab, Traveloka). Nota tulis tangan tanpa stempel toko tidak dianggap valid."},
        {"type": "paragraph", "text": "Pasal 5: Batas waktu maksimal pengajuan klaim adalah 30 (tiga puluh) hari kalender terhitung sejak tanggal transaksi yang tertera pada struk. Melewati batas ini, sistem akan menolak klaim secara otomatis."},
        {"type": "heading", "text": "BAB III: ALUR PENGAJUAN DAN VERIFIKASI (FLOW)"},
        {"type": "paragraph", "text": "Langkah 1: Karyawan memfoto atau melakukan scan bukti struk secara jelas, lalu mengunggahnya melalui aplikasi ERP/Finance internal perusahaan pada menu 'Expense Claim'."},
        {"type": "paragraph", "text": "Langkah 2: Karyawan melengkapi data formulir yang berisi: Tanggal Transaksi, Nama Merchant, Kategori Biaya, Nominal Sesuai Struk, dan Deskripsi/Tujuan Pengeluaran."}
    ],
    [
        {"type": "heading", "text": "BAB III: ALUR PENGAJUAN DAN VERIFIKASI (Lanjutan)"},
        {"type": "paragraph", "text": "Langkah 3: Atasan Langsung (Manager) menerima notifikasi dan melakukan validasi apakah pengeluaran tersebut benar ditujukan untuk kebutuhan proyek/operasional tim."},
        {"type": "paragraph", "text": "Langkah 4: Setelah disetujui Atasan, pengajuan masuk ke antrean Finance Admin. Finance Admin memeriksa orisinalitas struk, kesesuaian nilai nominal, dan kepatuhan terhadap plafon biaya (spending limit)."},
        {"type": "paragraph", "text": "Langkah 5: Apabila ditemukan ketidaksesuaian atau indikasi fraud (contoh: klaim ganda, manipulasi struk), Finance Admin berhak menolak klaim ('Reject') dengan menyertakan alasan tertulis."},
        {"type": "heading", "text": "BAB IV: PERSETUJUAN FINAL DAN PENCAIRAN"},
        {"type": "paragraph", "text": "Langkah 6: Pengajuan yang valid akan diteruskan ke Finance Manager untuk persetujuan akhir (Final Approval)."},
        {"type": "paragraph", "text": "Langkah 7: Divisi Kasir (Treasury) menjadwalkan transfer dana ke rekening pribadi karyawan. Service Level Agreement (SLA) pencairan dana adalah maksimal 5 (lima) hari kerja sejak dokumen disetujui secara final."}
    ]
]

if __name__ == "__main__":
    output_dir = "dummy_sops"
    os.makedirs(output_dir, exist_ok=True)

    create_pdf(os.path.join(output_dir, "SOP_Cuti_Karyawan.pdf"), "SOP CUTI DAN IZIN KARYAWAN", sop_cuti)
    create_pdf(os.path.join(output_dir, "SOP_Deployment_Server.pdf"), "SOP DEPLOYMENT SERVER PRODUCTION", sop_deployment)
    create_pdf(os.path.join(output_dir, "SOP_Reimbursement.pdf"), "SOP REIMBURSEMENT OPERASIONAL", sop_reimbursement)
