-- ============================================================
-- POC data migration — run in Supabase SQL Editor
-- ============================================================

UPDATE public.accounts SET
  poc1_name='Rinku Jhala', poc1_email='rinku@lawsikho.in', poc1_phone='99981 11758', poc1_designation='Director Sales and Sales Ops',
  poc2_name='Yash', poc2_email='yash@lawsikho.in', poc2_phone='83340 56623', poc2_designation='Co-founder',
  poc3_name='Siddhant Baid', poc3_email='siddhant@lawsikho.in', poc3_phone='99535 55910', poc3_designation='Founder'
WHERE tenant_id LIKE '55380%';

UPDATE public.accounts SET
  poc1_name='Anuj Sharma', poc1_email='asharma@amity.edu', poc1_phone='88514 81785', poc1_designation='CRM Manager',
  poc2_name='Khushboo Sharma', poc2_email=NULL, poc2_phone=NULL, poc2_designation='Amity Noida',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '24300%';

UPDATE public.accounts SET
  poc1_name='Shweta Ghodvinde', poc1_email='brand.shweta@podar.org', poc1_phone='8291180299', poc1_designation='TL',
  poc2_name='Roma Khot', poc2_email='brand.roma@podar.org', poc2_phone='8879829383', poc2_designation='TL',
  poc3_name='Mary Nallaseth', poc3_email='brand.tl1@podar.org', poc3_phone='8291774390', poc3_designation='TL'
WHERE tenant_id LIKE '42246%';

UPDATE public.accounts SET
  poc1_name='Mansij Gupta', poc1_email='mansij.gupta@apollo247insurance.com', poc1_phone='9548268056', poc1_designation='Inside Sales - CRM Spoc',
  poc2_name='Preethesh Fernandies', poc2_email='preethesh.f@apollo247.org', poc2_phone='8050398105', poc2_designation='Inside Sales - Apollo 247 CRM Spoc',
  poc3_name='Jehan Singh', poc3_email='jehan.singh@apollo247.org', poc3_phone='9811770463', poc3_designation='Manager - Sales and Marketing'
WHERE tenant_id LIKE '65155%';

UPDATE public.accounts SET
  poc1_name='Vinay', poc1_email='vkjain1@bajajauto.co.in', poc1_phone='8408878811', poc1_designation='Manager Digital Analytics',
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '62450%';

UPDATE public.accounts SET
  poc1_name='Samir Khan', poc1_email='samir.khan@emversity.com', poc1_phone='+91 79032 23909', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '72959%';

UPDATE public.accounts SET
  poc1_name='Puneet Sharma', poc1_email='puneet.sharma@cumail.in', poc1_phone='+91 81466 51532', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '70845%';

UPDATE public.accounts SET
  poc1_name='Jaideep Kundu', poc1_email='jaydeep.kundu@chettinadcement.com', poc1_phone='9750911466', poc1_designation='DTH',
  poc2_name='Anish Bang', poc2_email=NULL, poc2_phone='7447278787', poc2_designation='Senior Consultant BCG',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '76502%';

UPDATE public.accounts SET
  poc1_name='Nishant Sharma', poc1_email='Nishant.Sharma@ckbhospital.com', poc1_phone='88169 69070', poc1_designation='Senior Manager',
  poc2_name='Akash Kumar', poc2_email='Akash.Kumar@ckbhospital.com', poc2_phone='97180 55495', poc2_designation='Sales Head',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '41989%';

UPDATE public.accounts SET
  poc1_name='Satendra Gautam', poc1_email='satendra.gautam@careerlauncher.com', poc1_phone='721 033 3779', poc1_designation='Manager CRM',
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '6788%';

UPDATE public.accounts SET
  poc1_name='Ramresh Mina', poc1_email='ramresh.mina@thesleepcompany.in', poc1_phone='9571685127', poc1_designation='Product Manager',
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '72117%';

UPDATE public.accounts SET
  poc1_name='Rithik Dhankar', poc1_email='rithik.dhankhar@delhivery.com', poc1_phone='8800793625', poc1_designation='Business SPOC',
  poc2_name='Shravan Mishra', poc2_email='shravan.mishra@delhivery.com', poc2_phone='9599781708', poc2_designation='Business Head',
  poc3_name='Kalpana Razdan', poc3_email='kalpana.razdan@delhivery.com', poc3_phone='9886019196', poc3_designation='Product Head'
WHERE tenant_id LIKE '69474%';

UPDATE public.accounts SET
  poc1_name='Rahul Kumar Azad', poc1_email='rahulkumar.a@doctutorials.com', poc1_phone='8884942896', poc1_designation='Senior Manager Sales and Marketing',
  poc2_name='Bhaskar Barman', poc2_email='bhaskar.barman@doctutorials.com', poc2_phone='8972244596', poc2_designation=NULL,
  poc3_name='Keertana G', poc3_email='keertana.g@doctutorials.com', poc3_phone='8008872233', poc3_designation='Marketing Manager'
WHERE tenant_id LIKE '62521%';

UPDATE public.accounts SET
  poc1_name='M Sharan', poc1_email='m.sharan@dragarwal.com', poc1_phone='97898 42468', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '58405%';

UPDATE public.accounts SET
  poc1_name='Ashwini', poc1_email='ashwini.gunjal@ecozensolutions.com', poc1_phone='9702921046', poc1_designation=NULL,
  poc2_name='Shashank Shenoy', poc2_email='shashankshenoy@ecozensolutions.com', poc2_phone='9686172636', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '74045%';

UPDATE public.accounts SET
  poc1_name='Rohit', poc1_email='rohit@collegevidya.com', poc1_phone='99716 66477', poc1_designation='CEO',
  poc2_name='Abhishek Awasthi', poc2_email='Crm@collegvidy.com', poc2_phone='724 739 8374', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '62216%';

UPDATE public.accounts SET
  poc1_name='Yacoob Jacob', poc1_email='yakoob.jacob@entri.me', poc1_phone='9846040936', poc1_designation='Head of Sales',
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '60234%';

UPDATE public.accounts SET
  poc1_name='Ishan', poc1_email='ishan@even.in', poc1_phone='96119 65005', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '76389%';

UPDATE public.accounts SET
  poc1_name='Hitesh Mishrani', poc1_email='hitesh.mishrani@gupshup.io', poc1_phone='9768244654', poc1_designation=NULL,
  poc2_name='Amol Shinde', poc2_email='amol.shinde@gupshup.io', poc2_phone='9594414661', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '8287%';

UPDATE public.accounts SET
  poc1_name='Bipradeep Ghosh', poc1_email='bipradeep.ghosh@gusindia.global', poc1_phone='87610 75475', poc1_designation=NULL,
  poc2_name='Chandrashekher Singh', poc2_email='chandrashekher.singh@gusindia.global', poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '58385%';

UPDATE public.accounts SET
  poc1_name='Arun R', poc1_email='arun.r@guvi.in', poc1_phone='9943863078', poc1_designation='Business Strategy & Sales Operations',
  poc2_name='Sharukh Khan', poc2_email='sharukhan@hclguvi.com', poc2_phone='8778990715', poc2_designation='Data Scientist',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '50223%';

UPDATE public.accounts SET
  poc1_name='Shalviya Upadhyay', poc1_email='shalviya.upadhyay1@hindware.com', poc1_phone='870 098 5030', poc1_designation=NULL,
  poc2_name='Tushar Gupta', poc2_email='Tushar.Gupta@hindware.com', poc2_phone='96677 73970', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '62528%';

UPDATE public.accounts SET
  poc1_name='Dishika Sopariya', poc1_email='dishika@iide.co', poc1_phone='9765021210', poc1_designation='Deputy Manager',
  poc2_name='Viraj Khadye', poc2_email='viraj@iide.co', poc2_phone='8451855577', poc2_designation='Senior Operations Associate',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '63859%';

UPDATE public.accounts SET
  poc1_name='Jasmini Vinarkar', poc1_email='jasmini.vinarkar@imarticus.com', poc1_phone='9969277219', poc1_designation='Marketing',
  poc2_name='Khaleeq Kuchikar', poc2_email='khaleeq.kuchikar@imarticus.com', poc2_phone='9004684805', poc2_designation='Product Manager',
  poc3_name='Anshuman Anand', poc3_email='anshuman.anand@imarticus.com', poc3_phone='7738450688', poc3_designation=NULL
WHERE tenant_id LIKE '7764%';

UPDATE public.accounts SET
  poc1_name='Piyush Agarwal', poc1_email='piyush.agarwal@sonalika.com', poc1_phone='8462899888', poc1_designation='Strategy Head',
  poc2_name='Vivek Kumar', poc2_email='vivek.kumar16@sonalika.com', poc2_phone='7769944881', poc2_designation='Call Centre Head',
  poc3_name='Chand Babu', poc3_email='chand.babu@sonalika.com', poc3_phone='9756001885', poc3_designation='Business Teams Trainer and Sales SPOC'
WHERE tenant_id LIKE '62253%';

UPDATE public.accounts SET
  poc1_name='Mackey Agarwal', poc1_email='mackey.agarwal@jaincollege.ac.in', poc1_phone='+91 99644 84106', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '66807%';

UPDATE public.accounts SET
  poc1_name='Madhu Sawant', poc1_email='madhu.sawant@jaro.in', poc1_phone='9757110308', poc1_designation=NULL,
  poc2_name='Tanmay Jain', poc2_email='tanmay.j@jaro.in', poc2_phone='8291968314', poc2_designation=NULL,
  poc3_name='Ishaan Bhatia', poc3_email='ishaan.b@jaro.in', poc3_phone='989901958', poc3_designation=NULL
WHERE tenant_id LIKE '38288%';

UPDATE public.accounts SET
  poc1_name='Vipul', poc1_email='vipuls@lockthedeal.com', poc1_phone='9999789699', poc1_designation='Digital Transformation Head',
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '35931%';

UPDATE public.accounts SET
  poc1_name='Keerthi', poc1_email=NULL, poc1_phone=NULL, poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '55343%';

UPDATE public.accounts SET
  poc1_name='Naveen Vishwanath', poc1_email='naveen.vi@lifecell.in', poc1_phone='+91 97388 66693', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '56176%';

UPDATE public.accounts SET
  poc1_name='Aditya Goenka', poc1_email='aditya@be10x.in', poc1_phone=NULL, poc1_designation='Co-founder',
  poc2_name='Harshit Agarwal', poc2_email='harshit@houseofedtech.in', poc2_phone='9580950810', poc2_designation='Operations Head',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '68986%';

UPDATE public.accounts SET
  poc1_name='Gauresh Singh', poc1_email='Gauresh.Singh@go-mmt.com', poc1_phone='75036 54121', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '76247%';

UPDATE public.accounts SET
  poc1_name='Sonam Jain', poc1_email='sonam.jain@manipalhospitals.com', poc1_phone='6366843508', poc1_designation=NULL,
  poc2_name='Sarvade Tukaram', poc2_email='sarvade.tukaram@manipalhospitals.com', poc2_phone='9989195248', poc2_designation=NULL,
  poc3_name='Anand Baligar', poc3_email='anand.baligar@manipalhospitals.com', poc3_phone='9964533749', poc3_designation=NULL
WHERE tenant_id LIKE '49983%';

UPDATE public.accounts SET
  poc1_name='Madison Savita', poc1_email='madison.savita@godrejproperties.com', poc1_phone='98677 51815', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '73907%';

UPDATE public.accounts SET
  poc1_name='Anupam Singh', poc1_email='Anupam.Singh@Medanta.org', poc1_phone='87970 40500', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '76424%';

UPDATE public.accounts SET
  poc1_name='Anuj Azrenkar', poc1_email='anuj.azrenkar@futurense.com', poc1_phone='+91 99588 11104', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '66203%';

UPDATE public.accounts SET
  poc1_name='Yash Khandelwal', poc1_email='yash.khandelwal@motion.ac.in', poc1_phone='+91 70007 94021', poc1_designation=NULL,
  poc2_name='Vishnu Rathore', poc2_email='vishnu.rathore@motion.ac.in', poc2_phone='+91 78210 63920', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '52794%';

UPDATE public.accounts SET
  poc1_name='Chaitanya Balusupati', poc1_email='chaitanya.balusupati@leapfinance.com', poc1_phone=NULL, poc1_designation=NULL,
  poc2_name='Sharad Kumar', poc2_email='sharad.kumar@leapfinance.com', poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '53546%';

UPDATE public.accounts SET
  poc1_name='Rajat Kumar', poc1_email='rajat.kumar2@pw.live', poc1_phone=NULL, poc1_designation=NULL,
  poc2_name='Madaka Manoj Kumar', poc2_email='madaka@pw.live', poc2_phone='+91 97779 26206', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '76244%';

UPDATE public.accounts SET
  poc1_name='Vinitendra Singh', poc1_email='vinit.singh@petpooja.com', poc1_phone='9899917176', poc1_designation='Sales VP',
  poc2_name='Nishant Vaghela', poc2_email='nishant.vaghela@petpooja.com', poc2_phone='6359873966', poc2_designation=NULL,
  poc3_name='Shivani Soni', poc3_email='shivani.soni@petpooja.com', poc3_phone='6358941224', poc3_designation=NULL
WHERE tenant_id LIKE '54698%';

UPDATE public.accounts SET
  poc1_name='Nikhil Garg', poc1_email='nikhil.garg@prepladder.com', poc1_phone='884 724 0741', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '76590%';

UPDATE public.accounts SET
  poc1_name='Rohit Bhargava', poc1_email='rohit.bhargava@prismjohnson.in', poc1_phone='8175954961', poc1_designation='Business Excellence Head',
  poc2_name='Praful Yadav', poc2_email='prafull.yadav@prismjohnson.in', poc2_phone='8188066288', poc2_designation=NULL,
  poc3_name='Ashutosh Tiwari', poc3_email='ashutoshb.tiwari@prismjohnson.in', poc3_phone='7311145669', poc3_designation='Coach Business Team'
WHERE tenant_id LIKE '76287%';

UPDATE public.accounts SET
  poc1_name='Nagalakshmi Palisetti', poc1_email='nagalakshmi.palisetti@carehospitals.com', poc1_phone='8886994084', poc1_designation=NULL,
  poc2_name='Simran Kaur Sethi', poc2_email='simran.sethi@carehospitals.com', poc2_phone='9810549306', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '76673%';

UPDATE public.accounts SET
  poc1_name='Ganesh K', poc1_email='ganesh.k@quantinsti.com', poc1_phone='92844 37376', poc1_designation=NULL,
  poc2_name=NULL, poc2_email=NULL, poc2_phone=NULL, poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '13692%';

UPDATE public.accounts SET
  poc1_name='Paritosh Bande', poc1_email='Paritosh.Bande@infinitylearn.com', poc1_phone='9689687036', poc1_designation=NULL,
  poc2_name='Twinkle Garg', poc2_email='twinkle.garg@infinitylearn.com', poc2_phone='9610002444', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '54664%';

UPDATE public.accounts SET
  poc1_name='Yogeshwari L', poc1_email='yogeshwari@flobiz.in', poc1_phone='7892901577', poc1_designation=NULL,
  poc2_name='Arvind', poc2_email='arvind.p@flobiz.in', poc2_phone='8861779568', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '63074%';

UPDATE public.accounts SET
  poc1_name='Prayas Drolia', poc1_email='prayas.drolia@wheelseye.com', poc1_phone='70024 82502', poc1_designation='Marketplace SPOC',
  poc2_name='Namit Munjal', poc2_email='namit.munjal@wheelseye.com', poc2_phone='99586 19585', poc2_designation='Marketplace Decision Maker',
  poc3_name='Akshay Pandey', poc3_email='akshay.pandey@wheelseye.com', poc3_phone='85869 97479', poc3_designation='Offline Retail Team SPOC'
WHERE tenant_id LIKE '68685%';

UPDATE public.accounts SET
  poc1_name='Vijay Kumar', poc1_email='vijay.kumar@xanadu.in', poc1_phone=NULL, poc1_designation=NULL,
  poc2_name='Vigneswaran K', poc2_email='vigneswaran.k@xanadu.in', poc2_phone='8884710200', poc2_designation=NULL,
  poc3_name='Nitin Krishnan', poc3_email='nitin.krishnan@xanadu.in', poc3_phone='8898011210', poc3_designation=NULL
WHERE tenant_id LIKE '50486%';

UPDATE public.accounts SET
  poc1_name='Mokshit Mehta', poc1_email='mokshit.mehta@zelleducation.com', poc1_phone='9619614649', poc1_designation='Assistant Project Manager',
  poc2_name='Ganesh Pai', poc2_email='ganesh.pai@zelleducation.com', poc2_phone='9819881987', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '37705%';

UPDATE public.accounts SET
  poc1_name='Nandit Gupta', poc1_email='nandit.gupta@proptiger.com', poc1_phone='9782126200', poc1_designation='Senior Strategy Director',
  poc2_name='Priya Purohit', poc2_email='priya.purohit@proptiger.com', poc2_phone='8218414103', poc2_designation='Senior Product Manager',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '62854%';

UPDATE public.accounts SET
  poc1_name='Mukesh Prasad', poc1_email='mukesh.prasad@housing.com', poc1_phone='9958635777', poc1_designation='Business Head',
  poc2_name='Sidharth', poc2_email='siddarth@housing.com', poc2_phone='9650645323', poc2_designation='MIS Manager',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '64107%';

UPDATE public.accounts SET
  poc1_name='Vineet Kulkarni', poc1_email='vineet@bonito.in', poc1_phone='8497969922', poc1_designation='Business Head',
  poc2_name='Ravi Roy', poc2_email='ravi.r@bonito.in', poc2_phone='8197390188', poc2_designation='Sales',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '39689%';

UPDATE public.accounts SET
  poc1_name='Gayathri R', poc1_email='gayathri.r@urbanrise.in', poc1_phone='7305028229', poc1_designation='Senior Manager',
  poc2_name='Parmitha G', poc2_email='parmitha.g@urbanrise.in', poc2_phone='9384869819', poc2_designation='Manager IT',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '5528%';

UPDATE public.accounts SET
  poc1_name='Urvi Mehta', poc1_email='urvi.mehta@akzonobel.com', poc1_phone='9818385111', poc1_designation='Retail SPOC',
  poc2_name='Akansha Kapoor', poc2_email='akansha.kapoor@akzonobel.com', poc2_phone='9654657969', poc2_designation='Senior Project Manager',
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '77353%';

UPDATE public.accounts SET
  poc1_name='Chitra Zutshi', poc1_email='chitra.zutshi@heromotocorp.com', poc1_phone='9109104360', poc1_designation='Customer Engagement Head',
  poc2_name='Shashank Sinha', poc2_email='marketingba.it@heromotocorp.com', poc2_phone='8927682094', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '53732%';

UPDATE public.accounts SET
  poc1_name='Himanshu Garg', poc1_email='himanshu.garg@greenply.com', poc1_phone='9560230244', poc1_designation='Project Manager IT',
  poc2_name='Rajesh Sahay', poc2_email='rajesh.sahay@greenply.com', poc2_phone='9599927619', poc2_designation=NULL,
  poc3_name=NULL, poc3_email=NULL, poc3_phone=NULL, poc3_designation=NULL
WHERE tenant_id LIKE '57771%';

