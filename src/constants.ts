export const DISTRICTS = [
  { name: 'Kasaragod', code: 'KSD' },
  { name: 'Kannur', code: 'KNR' },
  { name: 'Wayanad', code: 'WYD' },
  { name: 'Kozhikode', code: 'KOZ' },
  { name: 'Malappuram', code: 'MLP' },
  { name: 'Palakkad', code: 'PKD' },
  { name: 'Thrissur', code: 'TCR' },
  { name: 'Ernakulam', code: 'EKM' },
  { name: 'Idukki', code: 'IDK' },
  { name: 'Kottayam', code: 'KTM' },
  { name: 'Alappuzha', code: 'ALP' },
  { name: 'Pathanamthitta', code: 'PTA' },
  { name: 'Kollam', code: 'KLM' },
  { name: 'Thiruvananthapuram', code: 'TVM' },
];

export const CONSTITUENCIES: Record<string, string[]> = {
  KSD: ['Manjeshwar', 'Kasaragod', 'Udma', 'Kanhangad', 'Trikaripur', 'NA'],
  KNR: ['Payyanur', 'Kalliasseri', 'Taliparamba', 'Irikkur', 'Azhikode', 'Kannur', 'Dharmadam', 'Thalassery', 'Kuthuparamba', 'Mattannur', 'Peravoor', 'NA'],
  WYD: ['Mananthavady', 'Sulthan Bathery', 'Kalpetta', 'NA'],
  KOZ: ['Vadakara', 'Kuttiadi', 'Nadapuram', 'Quilandy', 'Perambra', 'Balussery', 'Elathur', 'Kozhikode North', 'Kozhikode South', 'Beypore', 'Kunnamangalam', 'Koduvally', 'Thiruvambady', 'NA'],
  MLP: ['Kondotty', 'Eranad', 'Nilambur', 'Wandoor', 'Manjeri', 'Perinthalmanna', 'Mankada', 'Malappuram', 'Vengara', 'Vallikkunnu', 'Tirurangadi', 'Tanur', 'Tirur', 'Kottakkal', 'Thavanur', 'Ponnani', 'NA'],
  PKD: ['Thrithala', 'Pattambi', 'Shoranur', 'Ottapalam', 'Kongad', 'Mannarkkad', 'Malampuzha', 'Palakkad', 'Tarur', 'Chittur', 'Nenmara', 'Alathur', 'NA'],
  TCR: ['Chelakkara', 'Kunnamkulam', 'Guruvayur', 'Manalur', 'Wadakkanchery', 'Ollur', 'Thrissur', 'Nattika', 'Kaipamangalam', 'Irinjalakuda', 'Puthukkad', 'Chalakudy', 'Kodungallur', 'NA'],
  EKM: ['Perumbavoor', 'Angamaly', 'Aluva', 'Kalamassery', 'Paravur', 'Vypin', 'Kochi', 'Thrippunithura', 'Ernakulam', 'Thrikkakara', 'Kunnathunad', 'Piravom', 'Muvattupuzha', 'Kothamangalam', 'NA'],
  IDK: ['Devikulam', 'Udumbanchola', 'Thodupuzha', 'Idukki', 'Peerumade', 'NA'],
  KTM: ['Pala', 'Kaduthuruthy', 'Vaikom', 'Ettumanoor', 'Kottayam', 'Puthuppally', 'Changanassery', 'Kanjirappally', 'Poonjar', 'NA'],
  ALP: ['Aroor', 'Cherthala', 'Alappuzha', 'Ambalappuzha', 'Kuttanad', 'Haripad', 'Kayamkulam', 'Mavelikkara', 'Chengannur', 'NA'],
  PTA: ['Thiruvalla', 'Ranni', 'Aranmula', 'Konni', 'Adoor', 'NA'],
  KLM: ['Karunagappally', 'Chavara', 'Kunnathur', 'Kottarakkara', 'Pathanapuram', 'Punalur', 'Chadayamangalam', 'Kundara', 'Kollam', 'Eravipuram', 'Chathannoor', 'NA'],
  TVM: ['Varkala', 'Attingal', 'Chirayinkeezhu', 'Nedumangad', 'Vamanapuram', 'Kazhakkoottam', 'Vattiyoorkavu', 'Thiruvananthapuram', 'Nemom', 'Aruvikkara', 'Parassala', 'Kattakada', 'Kovalam', 'Neyyattinkara', 'NA']
};

export const STATES = [
  { name: 'Kerala', code: 'KL' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const MEMBERSHIP_TYPES = ['Annual'];

export const LOGO_URL = 'https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png';
export const FALLBACK_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/hcrs-portal.firebasestorage.app/o/assets%2Flogo.png?alt=media&token=8e953154-8c8c-4467-975a-69488339845d';

export const SHARED_URL = 'https://ais-pre-ccurk3ioy6y73ud5pdstgw-842131258035.asia-southeast1.run.app';

export const STATIC_GALLERY_IMAGES = [
  {
    url: 'https://i.ibb.co/xSk3qvSh/IMG-20251004-WA0031-1.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 1',
    createdAt: new Date('2025-10-04')
  },
  {
    url: 'https://i.ibb.co/vxGhVPz5/IMG-20260505-WA0131-1.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 2',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/v6V4WX9F/IMG-20260505-WA0132.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 3',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/4w0SvmtL/IMG-20260505-WA0135.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 4',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/jvnp5ZSW/IMG-20260505-WA0130.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 5',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/jkPcvD1s/IMG-20260505-WA0121.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 6',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/FkHppRHs/IMG-20260505-WA0120.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 7',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/DjBBrsv/IMG-20260505-WA0129.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 8',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/s9KQgkfk/IMG-20260505-WA0128.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 9',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/dsfs0cbL/IMG-20260505-WA0127.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 10',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/JjPy6DBd/IMG-20260505-WA0126.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 11',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/gMQW4k3G/IMG-20260505-WA0125.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 12',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/C5y03Zpj/IMG-20260505-WA0123.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 13',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/C3ZVnG9H/IMG-20260505-WA0131.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 14',
    createdAt: new Date('2026-05-05')
  },
  {
    url: 'https://i.ibb.co/Q7CnMMLT/IMG-20251004-WA0031-1.jpg',
    category: 'Secretariat Dharna',
    title: 'Dharna Highlight 15',
    createdAt: new Date('2025-10-04')
  },
  // MLA Petitions (140 Constituencies)
  { url: 'https://i.ibb.co/chJDmQ6f/FB-IMG-1778747038351.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 1', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/gkb9G35/FB-IMG-1778747056011.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 2', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/Kc6dbxbv/FB-IMG-1778747042819.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 3', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/7tJyHTG5/FB-IMG-1778747018816.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 4', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/8gV722Rs/FB-IMG-1778747025607.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 5', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/5XyZFR51/FB-IMG-1778747003242.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 6', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/XrmqTP7c/FB-IMG-1778747006061.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 7', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/V0qJWSYj/FB-IMG-1778746995051.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 8', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/ksKKMyvV/FB-IMG-1778746998890.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 9', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/Ld28Ct1D/FB-IMG-1778746988315.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 10', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/k2cGYZgW/FB-IMG-1778746992227.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 11', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/YBXT8CXc/FB-IMG-1778746979692.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 12', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/kg5Nj2cC/FB-IMG-1778746985333.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 13', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/ympKcKQY/FB-IMG-1778746966621.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 14', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/NgBPrt3f/FB-IMG-1778746969907.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 15', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/nNw9CMNx/FB-IMG-1778746960812.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 16', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/Hm4ydSW/FB-IMG-1778746963713.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 17', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/WNpGSDV1/FB-IMG-1778746951462.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 18', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/whCc8qHt/FB-IMG-1778746954462.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 19', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/0jjPYS1M/FB-IMG-1778746931915.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 20', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/KzqBg34p/FB-IMG-1778746935516.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 21', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/WNSFMP3s/FB-IMG-1778746920426.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 22', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/0pM9Yxmj/FB-IMG-1778746929179.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 23', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/zVQB5v80/FB-IMG-1778746910951.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 24', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/rKK91wd7/FB-IMG-1778746914692.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 25', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/QvdSyq2T/FB-IMG-1778746904211.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 26', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/qLNhLLtX/FB-IMG-1778746906965.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 27', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/8n5TbTLB/FB-IMG-1778746898528.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 28', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/Vcq5drJd/FB-IMG-1778746901777.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 29', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/Ngx71zLD/FB-IMG-1778746892426.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 30', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/LDxTGy9K/FB-IMG-1778746896183.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 31', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/C3RjGgNH/FB-IMG-1778746885633.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 32', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/fVgzSfSg/FB-IMG-1778746888632.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 33', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/VWrnyj0R/FB-IMG-1778746879461.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 34', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/spzX2mVJ/FB-IMG-1778746881828.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 35', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/chJbk09J/FB-IMG-1778746868230.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 36', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/Q7RCMBxj/FB-IMG-1778746873270.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 37', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/k2Xp0sLz/FB-IMG-1778746860484.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 38', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/xK5tMLGX/FB-IMG-1778746863941.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 39', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/xxPG0wN/FB-IMG-1778746852227.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 40', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/23QNNJ7K/FB-IMG-1778746857130.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 41', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/G3vqVpC8/FB-IMG-1778746849052.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 42', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/zTqY1RBr/FB-IMG-1778746846844.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 43', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/21dM2444/FB-IMG-1778746844510.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 44', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/chVHgGHS/FB-IMG-1778746839712.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 45', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/fzFNk28K/FB-IMG-1778746832412.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 46', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/GfZ3JhjM/FB-IMG-1778746823662.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 47', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/1fYNPc34/FB-IMG-1778746817205.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 48', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/5hDFNtK1/FB-IMG-1778746813758.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 49', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/VcLT94kn/FB-IMG-1778746804257.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 50', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/cSCCB9Ck/FB-IMG-1778746801105.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 51', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/gMpZXNBD/FB-IMG-1778746798245.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 52', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/5WkjddZK/FB-IMG-1778746794026.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 53', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/6RGncbck/FB-IMG-1778746790185.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 54', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/FkhZpk0r/FB-IMG-1778746785118.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 55', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/7881QV3/FB-IMG-1778746781179.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 56', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/7N4Nq5Tr/FB-IMG-1778746776779.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 57', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/n85WgVzJ/FB-IMG-1778746773601.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 58', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/mV72MJrw/FB-IMG-1778746766676.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 59', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/cK8nt2fv/FB-IMG-1778746759938.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 60', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/fzFnxcyx/FB-IMG-1778746742714.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 61', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/8nqNcyJY/FB-IMG-1778746739376.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 62', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/QjjTSkp0/FB-IMG-1778746735224.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 63', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/twc3cG7x/FB-IMG-1778746730607.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 64', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/1Y3xFv3c/FB-IMG-1778746717724.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 65', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/Txjjt1D0/FB-IMG-1778746708099.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 66', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/xqqpxNv0/FB-IMG-1778746658936.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 67', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/JWKMGM0w/FB-IMG-1778746495375.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 68', createdAt: new Date('2026-05-17') },
  { url: 'https://i.ibb.co/1YkGGLz1/FB-IMG-1778746247195.jpg', category: 'MLA Petitions (140 Constituencies)', title: 'MLA Petition 69', createdAt: new Date('2026-05-17') }
];

export const getDistrictCode = (nameOrCode: string): string => {
  if (!nameOrCode) return 'OTH';
  const normalized = nameOrCode.trim().toUpperCase();
  const d = DISTRICTS.find(dist => {
    const nameUpper = dist.name.toUpperCase();
    const plainLocalName = dist.name.split(' ')[0].toUpperCase();
    return nameUpper.includes(normalized) || normalized.includes(plainLocalName) || dist.code.toUpperCase() === normalized;
  });
  return d ? d.code : (normalized.length > 3 ? normalized.slice(0, 3) : normalized);
};

export const getAssemblyCode = (name: string): string => {
  if (!name) return 'NA';
  const clean = name.trim().toUpperCase().replace(/\s/g, '');
  if (clean === 'NA' || clean === 'N/A') return 'NA';

  const lookup: Record<string, string> = {
    // THIRUVANANTHAPURAM
    'VARKALA': 'VRK',
    'ATTINGAL': 'ATG',
    'CHIRAYINKEEZHU': 'CHK',
    'NEDUMANGAD': 'NDM',
    'VAMANAPURAM': 'VMP',
    'KAZHAKOOTTAM': 'KZM',
    'KAZHAKKOOTTAM': 'KZM',
    'VATTIYOORKAVU': 'VTK',
    'THIRUVANANTHAPURAM': 'TVM',
    'NEMOM': 'NEM',
    'ARUVIKKARA': 'ARV',
    'PARASSALA': 'PRS',
    'KATTAKADA': 'KTK',
    'KOVALAM': 'KVL',
    'NEYYATTINKARA': 'NYK',

    // KOLLAM
    'KARUNAGAPPALLY': 'KRP',
    'CHAVARA': 'CHV',
    'KUNNATHUR': 'KNR',
    'KOTTARAKKARA': 'KTR',
    'PATHANAPURAM': 'PTP',
    'PUNALUR': 'PNL',
    'CHADAYAMANGALAM': 'CDM',
    'KUNDARA': 'KND',
    'KOLLAM': 'KLM',
    'ERAVIPURAM': 'EVP',
    'CHATHANNOOR': 'CHN',

    // MALAPPURAM
    'KONDOTTY': 'KDT',
    'VALLIKKUNNU': 'VLK',
    'TIRURANGADI': 'TRD',
    'TANUR': 'TNR',
    'TIRUR': 'TRR',
    'KOTTAKKAL': 'KTK',
    'THAVANUR': 'TVR',
    'PONNANI': 'PNN',
    'PERINTHALMANNA': 'PTM',
    'MANKADA': 'MNK',
    'MALAPPURAM': 'MLP',
    'VENGARA': 'VGR',
    'VALLUVANAD': 'VLN',
    'NILAMBUR': 'NLB',
    'ERANAD': 'ERN',
    'WANDOOR': 'WDR',
    'MANJERI': 'MJR',
    
    // KASARAGOD (KSD)
    'MANJESHWAR': 'MNW',
    'KASARAGOD': 'KSG',
    'UDMA': 'UDM',
    'KANHANGAD': 'KHD',
    'TRIKARIPUR': 'TKP',

    // KANNUR (KNR)
    'PAYYANUR': 'PAY',
    'KALLIASSERI': 'KLS',
    'TALIPARAMBA': 'TBA',
    'IRIKKUR': 'IRK',
    'AZHIKODE': 'AZH',
    'KANNUR': 'KNR',
    'DHARMADAM': 'DMD',
    'THALASSERY': 'TSY',
    'KUTHUPARAMBA': 'KPB',
    'MATTANNUR': 'MTR',
    'PERAVOOR': 'PVR',

    // WAYANAD (WYD)
    'MANANTHAVADY': 'MTY',
    'SULTHANBATHERY': 'SBY',
    'KALPETTA': 'KPT',

    // KOZHIKODE (KOZ)
    'VADAKARA': 'VDK',
    'KUTTIADI': 'KTD',
    'NADAPURAM': 'NDP',
    'QUILANDY': 'QLD',
    'PERAMBRA': 'PRM',
    'BALUSSERY': 'BSY',
    'ELATHUR': 'ELT',
    'KOZHIKODENORTH': 'KKN',
    'KOZHIKODESOUTH': 'KKS',
    'BEYPORE': 'BYP',
    'KUNNAMANGALAM': 'KNG',
    'KODUVALLY': 'KDY',
    'THIRUVAMBADY': 'TVB',

    // PALAKKAD (PKD)
    'THRITHALA': 'TTL',
    'PATTAMBI': 'PTB',
    'SHORANUR': 'SNR',
    'OTTAPALAM': 'OTP',
    'KONGAD': 'KGD',
    'MANNARKKAD': 'MNK',
    'MALAMPUZHA': 'MLP',
    'PALAKKAD': 'PKD',
    'TARUR': 'TRR',
    'CHITTUR': 'CTR',
    'NENMARA': 'NMR',
    'ALATHUR': 'ALT',

    // THRISSUR (TCR / TSR)
    'CHELAKKARA': 'CKA',
    'KUNNAMKULAM': 'KKM',
    'GURUVAYUR': 'GVR',
    'MANALUR': 'MNL',
    'WADAKKANCHERY': 'WDK',
    'OLLUR': 'OLR',
    'THRISSUR': 'TSR',
    'NATTIKA': 'NTK',
    'KAIPAMANGALAM': 'KPG',
    'IRINJALAKUDA': 'IJK',
    'PUTHUKKAD': 'PKD',
    'CHALAKUDY': 'CKY',
    'KODUNGALLUR': 'KDL',

    // ERNAKULAM (EKM)
    'PERUMBAVOOR': 'PBR',
    'ANGAMALY': 'AGY',
    'ALUVA': 'ALV',
    'KALAMASSERY': 'KMY',
    'PARAVUR': 'PVR',
    'VYPIN': 'VPN',
    'KOCHI': 'KOC',
    'THRIPPUNITHURA': 'TPT',
    'ERNAKULAM': 'EKM',
    'THRIKKAKARA': 'TKK',
    'KUNNATHUNAD': 'KND',
    'PIRAVOM': 'PVM',
    'MUVATTUPUZHA': 'MVP',
    'KOTHAMANGALAM': 'KGM',

    // IDUKKI (IDK)
    'DEVIKULAM': 'DVK',
    'UDUMBANCHOLA': 'UDC',
    'THODUPUZHA': 'TDY', 
    'IDUKKI': 'IDK',
    'PEERUMADE': 'PMD',

    // KOTTAYAM (KTM)
    'PALA': 'PAL',
    'KADUTHURUTHY': 'KDT',
    'VAIKOM': 'VAK',
    'ETTUMANOOR': 'ETM',
    'KOTTAYAM': 'KTM',
    'PUTHUPPALLY': 'PPL',
    'CHANGANASSERY': 'CHY',
    'KANJIRAPPALLY': 'KJP',
    'POONJAR': 'PJR',

    // ALAPPUZHA (ALP)
    'AROOR': 'ARR',
    'CHERTHALA': 'CTL',
    'ALAPPUZHA': 'ALP',
    'AMBALAPUZHA': 'ABP',
    'KUTTANAD': 'KTD',
    'HARIPAD': 'HPD',
    'KAYAMKULAM': 'KYM',
    'MAVELIKKARA': 'MVK',
    'CHENGANNUR': 'CGR',

    // PATHANAMTHITTA (PTA)
    'THIRUVALLA': 'TVL',
    'RANNI': 'RNI',
    'ARANMULA': 'AML',
    'KONNI': 'KNI',
    'ADOOR': 'ADR',
  };

  if (lookup[clean]) return lookup[clean];
  return clean.length >= 3 ? clean.substring(0, 3) : clean.padEnd(3, 'X');
};

export const generateNewMembershipId = (district: string, assembly: string, serial: number): string => {
  const dCode = getDistrictCode(district).toUpperCase();
  const rawDist = dCode === 'TCR' ? 'TSR' : dCode;
  const aCode = getAssemblyCode(assembly).toUpperCase();
  const paddedSerial = String(serial).padStart(4, '0');
  return `HCRS-KL-${rawDist}-${aCode}-${paddedSerial}`;
};

