export interface GuidanceItem {
  id: string;
  category: 'fatwa' | 'hadith' | 'semak_hadis' | 'niat' | 'fidyah';
  title: string;
  arabic?: string;
  content: string;
  detail: string;
  sourceName: string;
  sourceUrl: string;
  sourceTag: string;
  authenticityStatus?: string;
}

export const ISLAMIC_GUIDANCE_LIST: GuidanceItem[] = [
  {
    id: 'bukhari_1953',
    category: 'hadith',
    title: 'Hutang Puasa Kepada Allah Lebih Berhak Dilunaskan',
    arabic: 'فَدَيْنُ اللَّهِ أَحَقُّ أَنْ يُقْضَى',
    content: 'Daripada Ibnu Abbas R.A, seorang wanita datang kepada Rasulullah SAW dan bertanya mengenai ibunya yang telah meninggal dunia sedangkan mempunyai hutang puasa, lalu Baginda SAW bersabda: "Maka hutang kepada Allah adalah lebih berhak untuk dilunaskan."',
    detail: 'Hadis ini menjadi dalil utama kewajipan menyelesaikan puasa ganti (qada) dengan segera selagi masih mempunyai kesihatan dan kesempatan hidup.',
    sourceName: 'Yayasan Dakwah Islamiah Malaysia (YADIM) - Sahih al-Bukhari No. 1953',
    sourceUrl: 'https://www.yadim.com.my/v2/shahih-bukhari-mengenai-puasa-ramadhan/',
    sourceTag: 'Sahih al-Bukhari',
    authenticityStatus: 'Sahih (Muttafaq ‘Alaih)',
  },
  {
    id: 'muftiwp_gabung_niat',
    category: 'fatwa',
    title: 'Hukum Menggabungkan Niat Puasa Qada & Puasa Sunat (Isnin/Khamis)',
    content: 'Menurut Pejabat Mufti Wilayah Persekutuan (PMWP), dibolehkan dan sah menggabungkan niat puasa ganti (qada) Ramadan dengan puasa sunat seperti hari Isnin dan Khamis atau Hari Putih (Ayyamul Bidh).',
    detail: 'Seseorang yang berniat puasa qada pada hari-hari sunat akan gugur kewajipan qadanya dan turut beroleh pahala puasa sunat berdasarkan pandangan muktamad dalam Mazhab Syafi‘i.',
    sourceName: 'Pejabat Mufti Wilayah Persekutuan (PMWP) - Irsyad Al-Fatwa',
    sourceUrl: 'https://www.muftiwp.gov.my/',
    sourceTag: 'Fatwa PMWP',
    authenticityStatus: 'Fatwa Rasmi PMWP',
  },
  {
    id: 'bukhari_1950_aisyah',
    category: 'hadith',
    title: 'Kelepasan Mengqada Puasa Hingga Bulan Sya\'ban',
    arabic: 'كَانَ يَكُونُ عَلَيَّ الصَّوْمُ مِنْ رَمَضَانَ، فَمَا أَسْتَطِيعُ أَنْ أَقْضِيَ إِلاَّ فِي شَعْبَانَ',
    content: 'Daripada Sayyidatina ‘Aisyah R.Anha berkata: "Dahulu aku mempunyai hutang puasa Ramadan, maka aku tidak mampu mengqadakannya melainkan pada bulan Sya\'ban kerana kedudukanku bersama Rasulullah SAW."',
    detail: 'Menunjukkan tempoh mengqada puasa adalah fleksibel sepanjang tahun sebelum tiba Ramadan seterusnya, namun digalakkan untuk mempercepatkannya (al-Mubadarah).',
    sourceName: 'Yayasan Dakwah Islamiah Malaysia (YADIM) - Sahih al-Bukhari No. 1950',
    sourceUrl: 'https://www.yadim.com.my/v2/shahih-bukhari-mengenai-puasa-ramadhan/',
    sourceTag: 'Sahih al-Bukhari',
    authenticityStatus: 'Sahih al-Bukhari',
  },
  {
    id: 'muftiwp_syarat_niat',
    category: 'niat',
    title: 'Syarat & Lafaz Niat Puasa Qada (Mestilah Sebelum Fajar)',
    arabic: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ قَضَاءِ فَرْضِ رَمَضَانَ لِلَّهِ تَعَالَى',
    content: 'Lafaz Niat: "Nawaitu shauma ghadin \'an qadha\'i fardhi Ramadhana lillahi Ta\'ala" (Sahaja aku puasa esok hari daripada qada fardhu Ramadan kerana Allah Taala).',
    detail: 'Berbeza dengan puasa sunat, puasa fardhu (termasuk qada) wajib diniatkan pada waktu malam (Tabyeet an-Niyyah) sebelum terbit fajar Subuh mengikut sepakat ulama feqah.',
    sourceName: 'Pejabat Mufti Wilayah Persekutuan (PMWP) - Al-Kafi Li al-Fatawi',
    sourceUrl: 'https://www.muftiwp.gov.my/',
    sourceTag: 'Panduan Fiqh PMWP',
    authenticityStatus: 'Mazhab Syafi‘i',
  },
  {
    id: 'semakhadis_keutamaan_segera',
    category: 'semak_hadis',
    title: 'Semak Hadis: Keutamaan Bersegera Menunaikan Kewajipan',
    arabic: 'بَادِرُوا بِالأَعْمَالِ',
    content: 'Daripada Abu Hurairah R.A, Rasulullah SAW bersabda: "Bersegeralah kamu melakukan amal kebajikan..." (Hadis Riwayat Muslim no. 118).',
    detail: 'Disemak melalui pangkalan data Semak Hadis & Kitab Hadith Muktabar: Hadis ini bertaraf Sahih. Mengingatkan agar tidak menangguhkan qada puasa kerana ajal dan keuzuran mendatang tidak diketahui.',
    sourceName: 'SemakHadis.com & Sahih Muslim No. 118',
    sourceUrl: 'https://semakhadis.com/',
    sourceTag: 'Semak Hadis',
    authenticityStatus: 'Sahih Muslim',
  },
  {
    id: 'muftiwp_fidyah_hukum',
    category: 'fidyah',
    title: 'Panduan Fidyah Jika Qada Ditangguh Melangkaui Ramadan Seterusnya',
    content: 'Jika seseorang menangguhkan qada puasa Ramadan sehingga masuk Ramadan tahun berikutnya tanpa sebarang uzur syar‘i, dia wajib mengqadakan puasa tersebut berserta membayar fidyah (1 cupak / ~675g beras bersamaan nilai wang semasa di negeri masing-masing bagi setiap hari yang ditinggalkan).',
    detail: 'Fidyah berganda mengikut bilangan tahun yang tertangguh mengikut pandangan jumhur ulama dan amalan di Malaysia.',
    sourceName: 'Pejabat Mufti Wilayah Persekutuan (PMWP) - Bayan Linnas & Irsyad Fatwa',
    sourceUrl: 'https://www.muftiwp.gov.my/',
    sourceTag: 'Fatwa Fidyah PMWP',
    authenticityStatus: 'Ketetapan Fatwa Kebangsaan & PMWP',
  },
];
