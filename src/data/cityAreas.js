// City -> common areas / localities, used by the Location dropdown on the
// Business Associate form. City names match src/data/locations.json.
// Cities not listed here (or areas not listed) can be typed with
// "Other (type it)". Locations already saved for a city are also offered
// in the dropdown (loaded from the backend), so the list grows with use.
const AREAS = {
  Hyderabad: ['Abids', 'Ameerpet', 'Attapur', 'Banjara Hills', 'Begumpet', 'Bachupally', 'Boduppal', 'Chanda Nagar', 'Dilsukhnagar', 'Gachibowli', 'Hayathnagar', 'Himayatnagar', 'HITEC City', 'Jubilee Hills', 'Kachiguda', 'Kokapet', 'Kompally', 'Kondapur', 'KPHB Colony', 'Kukatpally', 'LB Nagar', 'Madhapur', 'Manikonda', 'Mehdipatnam', 'Miyapur', 'Nallakunta', 'Nanakramguda', 'Narsingi', 'Nizampet', 'Panjagutta', 'Saroornagar', 'Somajiguda', 'SR Nagar', 'Tarnaka', 'Tolichowki', 'Uppal', 'Vanasthalipuram'],
  Secunderabad: ['AS Rao Nagar', 'Alwal', 'Bowenpally', 'ECIL', 'Kapra', 'Malkajgiri', 'Marredpally', 'Moula Ali', 'Paradise', 'Sainikpuri', 'Trimulgherry', 'West Marredpally'],
  Warangal: ['Hanamkonda', 'Kazipet', 'Hunter Road', 'Subedari', 'Naimnagar', 'Warangal Fort', 'Mulugu Road'],
  Karimnagar: ['Mukarampura', 'Kothirampur', 'Bhagathnagar', 'Jyothinagar', 'Ramnagar'],
  Visakhapatnam: ['Dwaraka Nagar', 'Gajuwaka', 'Madhurawada', 'MVP Colony', 'Seethammadhara', 'Siripuram', 'Rushikonda', 'Pendurthi', 'Akkayyapalem', 'Kancharapalem'],
  Vijayawada: ['Benz Circle', 'Governorpet', 'Gunadala', 'Labbipet', 'Moghalrajpuram', 'Patamata', 'Poranki', 'Suryaraopet', 'Bhavanipuram', 'Kanuru'],
  Guntur: ['Arundelpet', 'Brodipet', 'Lakshmipuram', 'Pattabhipuram', 'Kothapet', 'Amaravathi Road', 'Nallapadu'],
  Tirupati: ['Tiruchanoor', 'Alipiri', 'Bairagipatteda', 'Korlagunta', 'Renigunta Road', 'Balaji Colony'],
  Nellore: ['Magunta Layout', 'Dargamitta', 'Vedayapalem', 'Balaji Nagar', 'Haranathapuram'],
  Bengaluru: ['BTM Layout', 'Banashankari', 'Basavanagudi', 'Bellandur', 'Electronic City', 'HSR Layout', 'Hebbal', 'Indiranagar', 'Jayanagar', 'JP Nagar', 'Koramangala', 'KR Puram', 'Malleshwaram', 'Marathahalli', 'Rajajinagar', 'Sarjapur Road', 'Whitefield', 'Yelahanka', 'Yeshwanthpur'],
  Mysuru: ['Gokulam', 'Kuvempunagar', 'Vijayanagar', 'Saraswathipuram', 'Hebbal', 'JP Nagar'],
  Chennai: ['Adyar', 'Anna Nagar', 'Ashok Nagar', 'Besant Nagar', 'Chromepet', 'Egmore', 'Guindy', 'K K Nagar', 'Mylapore', 'Nungambakkam', 'OMR', 'Porur', 'Tambaram', 'T Nagar', 'Velachery', 'Vadapalani'],
  Coimbatore: ['Gandhipuram', 'RS Puram', 'Peelamedu', 'Saibaba Colony', 'Saravanampatti', 'Singanallur'],
  Mumbai: ['Andheri', 'Bandra', 'Borivali', 'Chembur', 'Colaba', 'Dadar', 'Ghatkopar', 'Goregaon', 'Kandivali', 'Malad', 'Mulund', 'Powai', 'Vile Parle', 'Worli'],
  Thane: ['Ghodbunder Road', 'Majiwada', 'Naupada', 'Vartak Nagar', 'Kopri', 'Wagle Estate'],
  'Navi Mumbai': ['Vashi', 'Nerul', 'Belapur', 'Kharghar', 'Airoli', 'Sanpada', 'Panvel'],
  Pune: ['Aundh', 'Baner', 'Hadapsar', 'Hinjewadi', 'Kalyani Nagar', 'Kharadi', 'Kothrud', 'Magarpatta', 'Pimple Saudagar', 'Shivaji Nagar', 'Viman Nagar', 'Wakad'],
  Nagpur: ['Dharampeth', 'Sadar', 'Civil Lines', 'Manish Nagar', 'Pratap Nagar', 'Sitabuldi'],
  Delhi: ['Connaught Place', 'Dwarka', 'Janakpuri', 'Karol Bagh', 'Lajpat Nagar', 'Laxmi Nagar', 'Mayur Vihar', 'Pitampura', 'Rajouri Garden', 'Rohini', 'Saket', 'Vasant Kunj'],
  'New Delhi': ['Connaught Place', 'Chanakyapuri', 'Greater Kailash', 'Hauz Khas', 'Defence Colony', 'Karol Bagh', 'Saket', 'Vasant Vihar'],
  Noida: ['Sector 18', 'Sector 62', 'Sector 50', 'Sector 137', 'Noida Extension', 'Sector 15'],
  Gurgaon: ['DLF Phase 1', 'DLF Phase 3', 'Sohna Road', 'Golf Course Road', 'MG Road', 'Sector 56', 'Udyog Vihar'],
  Kolkata: ['Ballygunge', 'Behala', 'Dum Dum', 'Garia', 'Howrah', 'Jadavpur', 'New Town', 'Park Street', 'Salt Lake', 'Tollygunge'],
  Ahmedabad: ['Bodakdev', 'Maninagar', 'Navrangpura', 'Satellite', 'Thaltej', 'Vastrapur', 'Prahlad Nagar', 'Chandkheda'],
  Jaipur: ['C Scheme', 'Malviya Nagar', 'Mansarovar', 'Vaishali Nagar', 'Raja Park', 'Jagatpura', 'Tonk Road'],
  Lucknow: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Aminabad', 'Alambagh', 'Jankipuram'],
  Kochi: ['Edappally', 'Kakkanad', 'Kaloor', 'Vyttila', 'Fort Kochi', 'Palarivattom', 'MG Road'],
};

export default AREAS;
