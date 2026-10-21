/**
 * MPTB SMART EXCURSIONS — Google Sheets transactional backend.
 * Install as a standalone Apps Script Web App (execute as authorised owner).
 * Set Script Properties SPREADSHEET_ID, API_SHARED_SECRET, BOOTSTRAP_ADMIN_EMAIL.
 * Run setupSheets() once. Keep this code and all secrets private to your Workspace.
 * This app uses a shared server-to-server key; NEVER call it directly from public browsers.
 */
const TABLES = {
  'Events': ['Event ID','Event Name','Event Year','Start Date','End Date','Venue','Status','Registration Open','Created At','Updated At','Description','Image URL'],
  'Participants': ['Participant ID','Name','Email','Mobile','Organisation','Designation','City','State','Country','Current Hotel','QR Token Reference','Created At','Updated At','Badge ID'],
  'Excursions': ['Excursion ID','Event ID','Name','Destination','Date','Reporting Time','Departure Time','Return Time','Meeting Point','Capacity','Status','Image URL','Created At','Updated At'],
  'Activities': ['Activity ID','Excursion ID','Activity Name','Activity Type','Capacity','Optional/Included','Charge','Safety Requirements','Minimum Age','Status'],
  'Bookings': ['Booking ID','Participant ID','Event ID','Excursion ID','Booking Date','Booking Status','Bus Assignment','Boarding Status','Boarding Timestamp','Arrival Status','Arrival Timestamp','Created At','Updated At'],
  'Activity Selections': ['Selection ID','Booking ID','Activity ID','Selection Type','Selection Timestamp','Activity Status','Completion Timestamp','Verified By'],
  'Bus Assignments': ['Bus ID','Event ID','Excursion ID','Bus Number','Vehicle Registration','Driver Name','Driver Mobile','Capacity','Assigned Operator'],
  'Operators': ['Operator ID','Name','Mobile','Email','Role','Assigned Event','Assigned Excursion','Assigned Bus/Site','Account Status','Last Login','Username','Password Salt','Password Hash','Credential Updated At','Login Attempts','Locked Until'],
  'Audit Logs': ['Log ID','Timestamp','Operator/User ID','Event ID','Participant ID','Booking ID','Action','Previous Value','New Value','Source Device','Remarks'],
  'Email Logs': ['Email ID','Participant ID','Booking ID','Recipient','Template','Delivery Status','Provider Message ID','Sent At','Failure Reason'],
  'System Settings': ['Setting Key','Setting Value','Description','Updated By','Updated At'],
  'Event Form Fields': ['Field ID','Event ID','Field Key','Label','Field Type','Required','Options','Display Order','Status'],
  'Participant Imports': ['Import ID','Source','External ID','Participant ID','Match Status','Imported At','Remarks'],
  'Check-in Events': ['Checkin ID','Booking ID','Participant ID','Event ID','Stage','Operator ID','Timestamp','Remarks'],
  'OTP Challenges': ['Email','Code Hash','Expires At','Attempts','Sent At'],
  'Sessions': ['Token Hash','Email','Expires At','Created At','Auth Method','Staff ID']
};
const ADMIN_ROLES = ['Super Admin','MPTB Admin','Event Coordinator'];
const OP_ROLES = ['Super Admin','MPTB Admin','Bus Operator','Site Operator','Activity Verifier','Tour Operator'];
const EDIT_TABLES = ['Events','Excursions','Activities'];
const STAFF_ROLES = ['MPTB Admin','Event Coordinator','Bus Operator','Site Operator','Activity Verifier','Tour Operator'];
const STAFF_ACTIONS = ['adminSummary','adminList','adminSave','staffManage','staffProfileSave','operatorLookup','operatorUpdate','activitiesForBooking','activityUpdate'];
const DELEGATE_ACTIONS = ['profile','badgeLookup','book','cancelBooking','myBookings','qrPass'];
const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function setupSheets() {
  const ss = spreadsheet_();
  Object.keys(TABLES).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,TABLES[name].length).setValues([TABLES[name]]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,TABLES[name].length).setBackground('#174938').setFontColor('#ffffff').setFontWeight('bold');
    } else {
      const existing = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
      const missing = TABLES[name].filter(h => !existing.includes(h));
      if (missing.length) {
        const additions = name === 'Operators' ? ['Username','Password Salt','Password Hash','Credential Updated At','Login Attempts','Locked Until'] : name === 'Sessions' ? ['Auth Method','Staff ID'] : [];
        if (missing.some(h => !additions.includes(h))) throw new Error(`Schema mismatch in ${name}: missing ${missing.join(', ')}`);
        sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
      }
    }
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('STAFF_PASSWORD_PEPPER')) props.setProperty('STAFF_PASSWORD_PEPPER', secureToken_());
  return 'MPTB Smart Excursions tables are ready.';
}
function spreadsheet_(){ const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('Set SPREADSHEET_ID in Script Properties.');return SpreadsheetApp.openById(id); }
function headers_(name) {if(!TABLES[name])throw new Error('Unknown data table.');const sh=spreadsheet_().getSheetByName(name);if(!sh)throw new Error('Missing sheet: '+name+'. Run setupSheets().');const cols=sh.getLastColumn();if(!cols)throw new Error('Missing headers in '+name);const h=sh.getRange(1,1,1,cols).getDisplayValues()[0];const missing=TABLES[name].filter(x=>!h.includes(x));if(missing.length)throw new Error('Schema mismatch in '+name+': '+missing.join(', '));return {sh,h};}
function rows_(name){const {sh,h}=headers_(name);if(sh.getLastRow()<2)return [];return sh.getRange(2,1,sh.getLastRow()-1,h.length).getDisplayValues().map((line,i)=>Object.assign({__row:i+2},Object.fromEntries(h.map((key,j)=>[key,line[j]]))));}
function clean_(row){const out={...row};delete out.__row;return out;}
function add_(name,data){const {sh,h}=headers_(name);sh.appendRow(h.map(k=>data[k]===undefined?'':String(data[k])));}
function update_(name,row,data){const {sh,h}=headers_(name);sh.getRange(row.__row,1,1,h.length).setValues([h.map(k=>data[k]===undefined?(row[k]||''):String(data[k]))]);}
function now_(){return new Date().toISOString();}
function uid_(prefix){return prefix+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase();}
function secureToken_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function hash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8).map(x=>('0'+(x&255).toString(16)).slice(-2)).join('');}
function passHash_(value){return hash_(String(value)+':'+PropertiesService.getScriptProperties().getProperty('API_SHARED_SECRET'));}
function mail_(addr,subject,body,template,participantId,bookingId){let status='Sent',error='';try{MailApp.sendEmail({to:addr,subject,body,name:'MPTB Smart Excursions'});}catch(e){status='Failed';error=String(e.message||e);}add_('Email Logs',{'Email ID':uid_('MAIL'),'Participant ID':participantId||'','Booking ID':bookingId||'',Recipient:addr,Template:template,'Delivery Status':status,'Sent At':now_(),'Failure Reason':error});if(status==='Failed')throw new Error('Email could not be delivered. Please contact event support.');}
function audit_(email,eventId,participantId,bookingId,action,from,to,remarks){add_('Audit Logs',{'Log ID':uid_('LOG'),Timestamp:now_(),'Operator/User ID':email,'Event ID':eventId||'','Participant ID':participantId||'','Booking ID':bookingId||'',Action:action,'Previous Value':from||'','New Value':to||'',Remarks:remarks||''});}
function active_(v){return ['active','open','published','true','yes','1'].includes(String(v||'').trim().toLowerCase());}
function enabled_(v){return ['active','true','yes','open','1'].includes(String(v||'').trim().toLowerCase());}
function date_(v){const s=String(v||'').trim();let m=s.match(/^(\d{4})-(\d\d)-(\d\d)/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return s;}
function validEmail_(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<250;}
function verified_(raw){const token=String(raw||'');if(!token||token.length>200)throw codeError_('Please sign in.','AUTH_REQUIRED');const entry=rows_('Sessions').find(s=>s['Token Hash']===passHash_(token)&&Number(s['Expires At'])>Date.now());if(!entry)throw codeError_('Session expired. Sign in again.','AUTH_REQUIRED');return { email: entry.Email.toLowerCase(), method: entry['Auth Method'] || 'DELEGATE', staffId: entry['Staff ID'] || '' };}
function codeError_(msg,code){const e=new Error(msg);e.code=code;return e;}
function participantFor_(email){return rows_('Participants').find(x=>String(x.Email).toLowerCase()===email);}
function roleFor_(email){const admin=String(PropertiesService.getScriptProperties().getProperty('BOOTSTRAP_ADMIN_EMAIL')||'').toLowerCase();if(email===admin)return {role:'Super Admin',name:'System Administrator','Assigned Event':'','Assigned Excursion':'','Assigned Bus/Site':''};const op=rows_('Operators').find(x=>String(x.Email).toLowerCase()===email&&active_(x['Account Status']));return op||{role:'Participant','Assigned Event':'','Assigned Excursion':'','Assigned Bus/Site':''};}
function requireRole_(email,roles){const r=roleFor_(email);if(!roles.includes(r.Role||r.role))throw codeError_('You are not authorised to perform this action.','FORBIDDEN');return r;}
function scope_(role,booking){if(role.role==='Super Admin'||role.Role==='Super Admin'||role.Role==='MPTB Admin'||role.Role==='Event Coordinator')return true;if(role['Assigned Event']&&role['Assigned Event']!==booking['Event ID'])return false;if(role['Assigned Excursion']&&role['Assigned Excursion']!==booking['Excursion ID'])return false;if(role['Assigned Bus/Site']&&booking['Bus Assignment']&&role['Assigned Bus/Site']!==booking['Bus Assignment'])return false;return !!(role['Assigned Event']||role['Assigned Excursion']||role['Assigned Bus/Site']);}
function serializeBooking_(b,ex){return Object.assign(clean_(b),{excursion:ex?clean_(ex):null});}
function catalogue_(){return rows_('Events').filter(e=>active_(e.Status)).map(clean_);}
function eventDetail_(p){const event=rows_('Events').find(x=>x['Event ID']===String(p.eventId||''));if(!event||!active_(event.Status))throw new Error('This event is not currently published.');const bookings=rows_('Bookings').filter(b=>b['Booking Status']==='Confirmed');const ex=rows_('Excursions').filter(x=>x['Event ID']===event['Event ID']&&active_(x.Status)).map(x=>{const used=bookings.filter(b=>b['Excursion ID']===x['Excursion ID']).length;return {...clean_(x),Remaining:Math.max(0,Number(x.Capacity||0)-used)}});return {event:clean_(event),excursions:ex};}
function requestOtp_(p){const email=String(p.email||'').trim().toLowerCase();if(!validEmail_(email))throw new Error('Enter a valid email address.');
  const admin=String(PropertiesService.getScriptProperties().getProperty('BOOTSTRAP_ADMIN_EMAIL')||'').toLowerCase();
  if(email===admin || rows_('Operators').some(x=>String(x.Email).toLowerCase()===email))throw new Error('Staff accounts must sign in from the Admin or Operator section.');
  if(p.intent==='login' && !participantFor_(email))throw new Error('No participant account found. Please sign up first.');const cache=CacheService.getScriptCache();const key='otp-'+hash_(email);if(cache.get(key))throw new Error('Please wait before requesting another code.');const six=String(100000+(parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,10),16)%900000));const codehash=passHash_(email+':'+six);const existing=rows_('OTP Challenges').find(r=>r.Email===email);const data={'Email':email,'Code Hash':codehash,'Expires At':Date.now()+OTP_TTL_MS,Attempts:0,'Sent At':now_()};const lock=LockService.getScriptLock();lock.waitLock(20000);try{if(existing)update_('OTP Challenges',existing,data);else add_('OTP Challenges',data);}finally{lock.releaseLock()};cache.put(key,'1',60);mail_(email,'MPTB Smart Excursions — Verification Code','Your verification code is '+six+'. It expires in 10 minutes. Never share this code.','OTP');return {sent:true};}
function verifyOtp_(p){const email=String(p.email||'').trim().toLowerCase(),code=String(p.code||'').trim();if(!validEmail_(email)||!/^[0-9]{6}$/.test(code))throw new Error('Enter the email and six-digit code.');const lock=LockService.getScriptLock();lock.waitLock(20000);try{const rec=rows_('OTP Challenges').find(r=>r.Email===email);if(!rec||Number(rec['Expires At'])<Date.now()||Number(rec.Attempts)>=MAX_OTP_ATTEMPTS)throw new Error('Code has expired or been used too many times. Request another.');if(rec['Code Hash']!==passHash_(email+':'+code)){update_('OTP Challenges',rec,{Attempts:Number(rec.Attempts)+1});throw new Error('Incorrect verification code.');}update_('OTP Challenges',rec,{'Code Hash':'','Expires At':'0',Attempts:MAX_OTP_ATTEMPTS});let participant=participantFor_(email);if(!participant){const record={'Participant ID':uid_('MPTB'),Name:'',Email:email,'QR Token Reference':secureToken_(),'Created At':now_(),'Updated At':now_()};add_('Participants',record);participant=record;}
if(!participant['QR Token Reference']){update_('Participants',participant,{'QR Token Reference':secureToken_()});}
const session=secureToken_();add_('Sessions',{'Token Hash':passHash_(session),Email:email,'Expires At':Date.now()+SESSION_TTL_MS,'Created At':now_(),'Auth Method':'DELEGATE'});audit_(email,'',participant['Participant ID'],'','SIGN_IN','','Verified','Email OTP');return {data:{email,participantId:participant['Participant ID']},session};}finally{lock.releaseLock()}}
function me_(identity){const email=identity.email,staff=identity.method==='STAFF';const op=staff?roleFor_(email):{role:'Participant'};const part=staff?null:participantFor_(email);return {role:op.role||op.Role||'Participant',name:op.Name||op.name||part?.Name||'',email,username:staff?(op.Username||''):'',mobile:staff?(op.Mobile||''):'',participant:part?clean_(part):null,assignedEvent:op['Assigned Event']||'',assignedExcursion:op['Assigned Excursion']||'',assignedBus:op['Assigned Bus/Site']||''};}
function profile_(email,p){const existing=participantFor_(email);if(!existing)throw new Error('Verified participant record not found.');let source=null;const badge=String(p.badgeId||'').trim();if(badge){source=rows_('Participants').find(x=>x['Badge ID']===badge);if(!source||String(source.Email||'').toLowerCase()!==email)throw new Error('Badge ID does not match your verified email. Contact the event desk for correction.');}
  const fields=['Name','Mobile','Organisation','Designation','City','State','Country','Current Hotel'];const supplied=p.profile||{};const patch={};fields.forEach(k=>{if(supplied[k]!==undefined)patch[k]=String(supplied[k]).trim().slice(0,300);else if(source&&source[k])patch[k]=source[k];});if(source){patch['Badge ID']=badge;}else if(badge&&!existing['Badge ID']){ // Prevent claiming an arbitrary badge unless it is tied to the verified email.
    throw new Error('Badge ID not found or unverified. You can save your profile without a badge.');
  }
  if(!patch.Name&&!existing.Name)throw new Error('Please enter your full name.');patch['Updated At']=now_();update_('Participants',existing,patch);audit_(email,'',existing['Participant ID'],'','PROFILE_UPDATED','','Saved','');return {updated:true};}
function book_(email,p){const participant=participantFor_(email);if(!participant||!participant.Name)throw new Error('Complete your name in My Profile before booking.');const excursionId=String(p.excursionId||'');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const x=rows_('Excursions').find(e=>e['Excursion ID']===excursionId);if(!x||!active_(x.Status))throw new Error('Excursion is not open for registration.');const event=rows_('Events').find(e=>e['Event ID']===x['Event ID']);if(!event||!active_(event.Status)||!enabled_(event['Registration Open']))throw new Error('Event registration is closed.');const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');if(date_(x.Date)<today)throw new Error('This excursion date has passed.');const current=rows_('Bookings').filter(b=>b['Booking Status']==='Confirmed');if(current.some(b=>b['Participant ID']===participant['Participant ID']&&b['Excursion ID']===excursionId))throw new Error('You already have a confirmed booking for this excursion.');const excursions=rows_('Excursions');const conflict=current.find(b=>b['Participant ID']===participant['Participant ID']&&b['Event ID']===x['Event ID']&&date_(excursions.find(z=>z['Excursion ID']===b['Excursion ID'])?.Date)===date_(x.Date));if(conflict)throw new Error('Only one morning experience per date is allowed for this event. Cancel the existing booking before changing it.');const capacity=Number(x.Capacity||0);if(!Number.isInteger(capacity)||capacity<=0)throw new Error('This excursion has no configured capacity.');if(current.filter(b=>b['Excursion ID']===excursionId).length>=capacity)throw new Error('Sorry, this excursion is fully booked.');const included=rows_('Activities').filter(a=>a['Excursion ID']===excursionId&&active_(a.Status)&&String(a['Optional/Included']).toLowerCase()==='included');const selections=rows_('Activity Selections');for(const a of included){const max=Number(a.Capacity||capacity);if(max<=0||selections.filter(s=>s['Activity ID']===a['Activity ID']&&s['Activity Status']!=='Cancelled').length>=max)throw new Error('Included activity is full: '+a['Activity Name']);}const booking={'Booking ID':uid_('BK'),'Participant ID':participant['Participant ID'],'Event ID':event['Event ID'],'Excursion ID':excursionId,'Booking Date':now_(),'Booking Status':'Confirmed','Boarding Status':'Pending','Arrival Status':'Pending','Created At':now_(),'Updated At':now_()};add_('Bookings',booking);included.forEach(a=>add_('Activity Selections',{'Selection ID':uid_('SEL'),'Booking ID':booking['Booking ID'],'Activity ID':a['Activity ID'],'Selection Type':'Originally Registered','Selection Timestamp':now_(),'Activity Status':'Pending'}));audit_(email,event['Event ID'],participant['Participant ID'],booking['Booking ID'],'BOOKED','','Confirmed',x.Name);try{mail_(email,'MPTB Excursion Booking Confirmed','Hello '+participant.Name+',\n\nYour booking is confirmed.\nEvent: '+event['Event Name']+'\nExcursion: '+x.Name+'\nDate: '+date_(x.Date)+'\nReporting: '+x['Reporting Time']+'\nMeeting point: '+x['Meeting Point']+'\n\nYour permanent digital QR pass is available in the participant portal.','BOOKING',participant['Participant ID'],booking['Booking ID']);}catch(e){audit_(email,event['Event ID'],participant['Participant ID'],booking['Booking ID'],'EMAIL_FAILED','','',e.message);}return {bookingId:booking['Booking ID']};}finally{lock.releaseLock()}}
function myBookings_(email){const p=participantFor_(email);if(!p)return [];const exc=rows_('Excursions');return rows_('Bookings').filter(x=>x['Participant ID']===p['Participant ID']).map(b=>serializeBooking_(b,exc.find(x=>x['Excursion ID']===b['Excursion ID'])));}
function cancelBooking_(email,p){const participant=participantFor_(email);const lock=LockService.getScriptLock();lock.waitLock(30000);try{const b=rows_('Bookings').find(x=>x['Booking ID']===String(p.bookingId)&&x['Participant ID']===participant?.['Participant ID']);if(!b)throw new Error('Booking not found.');if(b['Booking Status']==='Cancelled')return {alreadyCancelled:true};if(b['Boarding Status']==='Boarded'||b['Arrival Status']==='Arrived')throw new Error('Contact the event desk to cancel an already-started excursion.');if(b['Booking Status']!=='Confirmed')throw new Error('Booking cannot be cancelled.');update_('Bookings',b,{'Booking Status':'Cancelled','Updated At':now_()});audit_(email,b['Event ID'],b['Participant ID'],b['Booking ID'],'CANCELLED','Confirmed','Cancelled','Participant request');return {cancelled:true};}finally{lock.releaseLock()}}
function summary_(email){requireRole_(email,ADMIN_ROLES);const b=rows_('Bookings');return {events:rows_('Events').length,participants:rows_('Participants').length,bookings:b.length,confirmed:b.filter(x=>x['Booking Status']==='Confirmed').length,boarded:b.filter(x=>x['Boarding Status']==='Boarded').length,arrived:b.filter(x=>x['Arrival Status']==='Arrived').length};}
function adminList_(email,p){requireRole_(email,ADMIN_ROLES);const t=String(p.table||'');const allowed=['Events','Participants','Excursions','Activities','Bookings','Activity Selections','Bus Assignments','Operators','Audit Logs'];if(!allowed.includes(t))throw new Error('Table is not available in the admin interface.');if(t==='Operators')requireRole_(email,['Super Admin']);return rows_(t).map(x=>{const out=clean_(x);delete out['Password Salt'];delete out['Password Hash'];delete out['Login Attempts'];delete out['Locked Until'];return out;});}
function adminSave_(email,p){const role=requireRole_(email,ADMIN_ROLES);const t=String(p.table||'');if(!EDIT_TABLES.includes(t))throw new Error('Table cannot be edited here.');if(t==='Operators'&&role.role!=='Super Admin'&&role.Role!=='Super Admin'&&role.Role!=='MPTB Admin')throw new Error('Only a senior administrator can manage operator access.');const submitted=p.row||{},key=TABLES[t][0],id=String(submitted[key]||uid_(t==='Events'?'EV':t==='Excursions'?'EX':t==='Activities'?'ACT':'OP'));const patch={};TABLES[t].forEach(h=>{if(h in submitted)patch[h]=String(submitted[h]).slice(0,2000)});patch[key]=id;if(t==='Excursions'){if(!rows_('Events').some(x=>x['Event ID']===patch['Event ID']))throw new Error('Event ID does not exist.');if(patch.Capacity!==undefined&&(!Number.isInteger(Number(patch.Capacity))||Number(patch.Capacity)<0))throw new Error('Capacity must be a non-negative whole number.')}if(t==='Operators'&&patch.Email&&!validEmail_(String(patch.Email).toLowerCase()))throw new Error('Enter valid operator email.');if(t==='Operators'&&patch.Role==='Super Admin'&&(role.role||role.Role)!=='Super Admin')throw new Error('Only Super Admin can assign Super Admin access.');if(t==='Events'&&patch['Registration Open']!==undefined&&!['true','false','yes','no','open','closed','1','0'].includes(String(patch['Registration Open']).toLowerCase()))throw new Error('Registration Open must be TRUE or FALSE.');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const old=rows_(t).find(r=>r[key]===id);patch['Updated At']=now_();if(old){update_(t,old,patch);}else{patch['Created At']=now_();add_(t,patch)}audit_(email,patch['Event ID']||id,'','',old?'ADMIN_UPDATE':'ADMIN_CREATE',old?JSON.stringify(clean_(old)).slice(0,1500):'',JSON.stringify(patch).slice(0,1500),t);return {id,saved:true};}finally{lock.releaseLock()}}
function operatorLookup_(email,p){const role=requireRole_(email,OP_ROLES);const token=String(p.token||'').trim();if(token.length<40||token.length>200)throw new Error('Invalid digital pass.');const participant=rows_('Participants').find(x=>x['QR Token Reference']===token);if(!participant)throw new Error('Digital pass not recognised.');const excursions=rows_('Excursions');const bookings=rows_('Bookings').filter(b=>b['Participant ID']===participant['Participant ID']&&b['Booking Status']==='Confirmed'&&scope_(role,b)).map(b=>serializeBooking_(b,excursions.find(x=>x['Excursion ID']===b['Excursion ID'])));if(!bookings.length)throw new Error('No eligible bookings are assigned to this operator.');return {participant:{'Participant ID':participant['Participant ID'],Name:participant.Name,'Current Hotel':participant['Current Hotel']},bookings};}
function operatorUpdate_(email,p){const role=requireRole_(email,OP_ROLES);const operation=String(p.operation||'');if(!['board','arrive'].includes(operation))throw new Error('Unsupported field operation.');const roleName=role.role||role.Role;if(operation==='board'&&!['Super Admin','MPTB Admin','Bus Operator','Tour Operator'].includes(roleName))throw new Error('You are not authorised to confirm boarding.');if(operation==='arrive'&&!['Super Admin','MPTB Admin','Site Operator','Tour Operator'].includes(roleName))throw new Error('You are not authorised to confirm site arrival.');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const b=rows_('Bookings').find(x=>x['Booking ID']===String(p.bookingId||''));if(!b||b['Booking Status']!=='Confirmed'||!scope_(role,b))throw new Error('Booking is not eligible or assigned to your team.');const statusKey=operation==='board'?'Boarding Status':'Arrival Status',timestampKey=operation==='board'?'Boarding Timestamp':'Arrival Timestamp',value=operation==='board'?'Boarded':'Arrived';if(b[statusKey]===value)return {alreadyRecorded:true,timestamp:b[timestampKey]};if(operation==='arrive'&&b['Boarding Status']!=='Boarded')throw new Error('Boarding has not been recorded. Supervisor exception workflow is required.');const ts=now_();update_('Bookings',b,{[statusKey]:value,[timestampKey]:ts,'Updated At':ts});add_('Check-in Events',{'Checkin ID':uid_('SCAN'),'Booking ID':b['Booking ID'],'Participant ID':b['Participant ID'],'Event ID':b['Event ID'],Stage:value,'Operator ID':email,Timestamp:ts});audit_(email,b['Event ID'],b['Participant ID'],b['Booking ID'],operation==='board'?'BOARDING':'SITE_ARRIVAL',b[statusKey],value,'Operator confirmation');return {updated:true,timestamp:ts};}finally{lock.releaseLock()}}

function activitiesForBooking_(email,p){
  const role=requireRole_(email,OP_ROLES),b=rows_('Bookings').find(x=>x['Booking ID']===String(p.bookingId||''));
  if(!b||b['Booking Status']!=='Confirmed'||!scope_(role,b))throw new Error('Booking not assigned to this operator.');
  const activities=rows_('Activities').filter(a=>a['Excursion ID']===b['Excursion ID']&&active_(a.Status)).map(clean_);
  const selections=rows_('Activity Selections').filter(x=>x['Booking ID']===b['Booking ID']).map(clean_);
  return {activities,selections};
}
function activityUpdate_(email,p){
  const role=requireRole_(email,['Super Admin','MPTB Admin','Activity Verifier','Site Operator','Tour Operator']);
  const bookingId=String(p.bookingId||''),activityId=String(p.activityId||''),operation=String(p.operation||'');
  if(!['add','complete'].includes(operation))throw new Error('Unsupported activity operation.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const b=rows_('Bookings').find(x=>x['Booking ID']===bookingId);
    if(!b||b['Booking Status']!=='Confirmed'||!scope_(role,b))throw new Error('Booking not assigned or not confirmed.');
    if(b['Arrival Status']!=='Arrived')throw new Error('Mark the participant as arrived before updating activities.');
    const a=rows_('Activities').find(x=>x['Activity ID']===activityId&&x['Excursion ID']===b['Excursion ID']);
    if(!a||!active_(a.Status))throw new Error('Activity is not available at this excursion.');
    const existing=rows_('Activity Selections').find(x=>x['Booking ID']===bookingId&&x['Activity ID']===activityId);
    if(operation==='add'){
      if(existing)return {alreadyAdded:true};
      if(String(a['Optional/Included']).toLowerCase()!=='optional')throw new Error('Only optional activities may be added on site.');
      const capacity=Number(a.Capacity||0);
      if(!Number.isInteger(capacity)||capacity<=0)throw new Error('Activity has no configured capacity.');
      const all=rows_('Activity Selections').filter(x=>x['Activity ID']===activityId&&x['Activity Status']!=='Cancelled');
      if(all.length>=capacity)throw new Error('This optional activity is full.');
      add_('Activity Selections',{'Selection ID':uid_('SEL'),'Booking ID':bookingId,'Activity ID':activityId,'Selection Type':'Added On-site','Selection Timestamp':now_(),'Activity Status':'Pending'});
      audit_(email,b['Event ID'],b['Participant ID'],bookingId,'OPTIONAL_ACTIVITY_ADDED','',activityId,a['Activity Name']);
      return {added:true};
    }
    if(!existing)throw new Error('Activity is not selected for this booking. Add an eligible optional activity first.');
    if(existing['Activity Status']==='Completed')return {alreadyCompleted:true,timestamp:existing['Completion Timestamp']};
    const ts=now_();update_('Activity Selections',existing,{'Activity Status':'Completed','Completion Timestamp':ts,'Verified By':email});
    audit_(email,b['Event ID'],b['Participant ID'],bookingId,'ACTIVITY_COMPLETED','Pending','Completed',a['Activity Name']);
    return {completed:true,timestamp:ts};
  } finally {lock.releaseLock();}
}


/** Staff passwords are never persisted in clear text. The pepper is a separate Script Property. */
function staffHash_(password, salt) {
  const pepper=PropertiesService.getScriptProperties().getProperty('STAFF_PASSWORD_PEPPER');
  if(!pepper||pepper.length<32)throw new Error('Staff credential service is not initialised. Run setupSheets().');
  let value=String(salt)+':'+String(password)+':'+pepper;
  for(let i=0;i<4000;i++)value=hash_(value);
  return value;
}
function staffPasswordValid_(password){
  return typeof password==='string' && password.length>=14 && password.length<=128 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password);
}
function staffSession_(email,staffId){
  const token=secureToken_();
  add_('Sessions',{'Token Hash':passHash_(token),Email:email,'Expires At':Date.now()+SESSION_TTL_MS,'Created At':now_(),'Auth Method':'STAFF','Staff ID':staffId||''});
  return {data:{email,role:staffId?'Staff':'Super Admin'},session:token};
}
function bootstrapStaffSession_(p){
  const configured=PropertiesService.getScriptProperties().getProperty('BOOTSTRAP_BRIDGE_KEY')||'';
  if(configured.length<32||String(p.bootstrapKey||'')!==configured)throw codeError_('Bootstrap staff authentication unavailable.','FORBIDDEN');
  const email=String(PropertiesService.getScriptProperties().getProperty('BOOTSTRAP_ADMIN_EMAIL')||'').toLowerCase();
  if(!validEmail_(email))throw new Error('Set BOOTSTRAP_ADMIN_EMAIL in Apps Script properties.');
  audit_(email,'','','','SUPER_ADMIN_SIGN_IN','','Verified','Cloudflare credentials');
  return staffSession_(email,'');
}
function staffLogin_(p){
  const username=String(p.username||'').trim().toLowerCase(),password=String(p.password||'');
  const area=p.area==='operator'?'operator':'admin';
  if(!/^[a-z][a-z0-9._-]{3,39}$/.test(username)||!password||password.length>128)throw codeError_('Invalid username or password.','AUTH_REQUIRED');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const staff=rows_('Operators').find(x=>String(x.Username||'').toLowerCase()===username);
    if(!staff||!active_(staff['Account Status']))throw codeError_('Invalid username or password.','AUTH_REQUIRED');
    if(Number(staff['Locked Until']||0)>Date.now())throw codeError_('Account temporarily locked. Contact Super Admin.','FORBIDDEN');
    const match=staff['Password Salt']&&staff['Password Hash']&&staffHash_(password,staff['Password Salt'])===staff['Password Hash'];
    if(!match){
      const failures=Number(staff['Login Attempts']||0)+1;
      update_('Operators',staff,{'Login Attempts':failures,'Locked Until':failures>=5?Date.now()+15*60*1000:'0'});
      throw codeError_('Invalid username or password.','AUTH_REQUIRED');
    }
    if(area==='admin'&&!['MPTB Admin','Event Coordinator'].includes(staff.Role))throw codeError_('Use the Operator login for this account.','FORBIDDEN');
    if(area==='operator'&&!OP_ROLES.includes(staff.Role))throw codeError_('Use the Admin login for this account.','FORBIDDEN');
    update_('Operators',staff,{'Login Attempts':0,'Locked Until':0,'Last Login':now_()});
    audit_(staff.Email,'','','','STAFF_SIGN_IN','','Verified',staff.Role);
    return staffSession_(String(staff.Email).toLowerCase(),staff['Operator ID']);
  }finally{lock.releaseLock();}
}
function badgeLookup_(email,p){
  const id=String(p.badgeId||'').trim();
  if(id.length<2||id.length>100)throw new Error('Enter your valid badge ID.');
  const found=rows_('Participants').find(x=>String(x['Badge ID']).toLowerCase()===id.toLowerCase()&&String(x.Email).toLowerCase()===email);
  if(!found)throw new Error('Badge not found for your verified email. Continue using manual registration.');
  const keys=['Name','Mobile','Organisation','Designation','City','State','Country','Current Hotel','Badge ID'];
  return Object.fromEntries(keys.map(k=>[k,found[k]||'']));
}
function staffManage_(email,p){
  requireRole_(email,['Super Admin']);
  const operation=String(p.operation||''),input=p.staff||{};
  const username=String(input.username||'').trim().toLowerCase(),mail=String(input.email||'').trim().toLowerCase();
  const id=String(p.staffId||''),lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    const all=rows_('Operators'),existing=all.find(x=>x['Operator ID']===id);
    if(operation==='create'){
      if(!/^[a-z][a-z0-9._-]{3,39}$/.test(username)||!validEmail_(mail)||!STAFF_ROLES.includes(input.role)||!staffPasswordValid_(input.password))
        throw new Error('Provide a unique username, valid email, approved role and strong password (14+ characters, upper/lower/digit/symbol).');
      if(all.some(x=>String(x.Username).toLowerCase()===username||String(x.Email).toLowerCase()===mail)||mail===String(PropertiesService.getScriptProperties().getProperty('BOOTSTRAP_ADMIN_EMAIL')).toLowerCase())throw new Error('Username or email already reserved.');
      const salt=secureToken_();
      const row={'Operator ID':uid_('OP'),Username:username,Name:String(input.name||'').trim().slice(0,100),Mobile:String(input.mobile||'').slice(0,30),Email:mail,Role:input.role,'Assigned Event':String(input.assignedEvent||''),'Assigned Excursion':String(input.assignedExcursion||''),'Assigned Bus/Site':String(input.assignedBus||''),'Account Status':'Active','Password Salt':salt,'Password Hash':staffHash_(input.password,salt),'Credential Updated At':now_(),'Login Attempts':0,'Locked Until':0};
      if(!row.Name)throw new Error('Enter the staff member name.');
      add_('Operators',row);
      audit_(email,'','','','STAFF_CREATED','',row['Operator ID'],username+' '+input.role);
      return {saved:true,staffId:row['Operator ID']};
    }
    if(!existing)throw new Error('Staff account not found.');
    if(operation==='disable'||operation==='enable'){
      update_('Operators',existing,{'Account Status':operation==='disable'?'Inactive':'Active'});
    }else if(operation==='rotatePassword'){
      if(!staffPasswordValid_(input.password))throw new Error('Password must have 14+ characters including upper/lowercase letters, number and symbol.');
      const salt=secureToken_();
      update_('Operators',existing,{'Password Salt':salt,'Password Hash':staffHash_(input.password,salt),'Credential Updated At':now_(),'Login Attempts':0,'Locked Until':0});
    }else if(operation==='update'){
      const patch={};
      if(input.name!==undefined)patch.Name=String(input.name).trim().slice(0,100);
      if(input.mobile!==undefined)patch.Mobile=String(input.mobile).slice(0,30);
      if(input.assignedEvent!==undefined)patch['Assigned Event']=String(input.assignedEvent).slice(0,100);
      if(input.assignedExcursion!==undefined)patch['Assigned Excursion']=String(input.assignedExcursion).slice(0,100);
      if(input.assignedBus!==undefined)patch['Assigned Bus/Site']=String(input.assignedBus).slice(0,100);
      if(input.role!==undefined){if(!STAFF_ROLES.includes(input.role))throw new Error('Invalid role.');patch.Role=input.role;}
      update_('Operators',existing,patch);
    }else throw new Error('Unsupported staff operation.');
    // Terminate previous sessions after disable/rotation.
    if(operation==='disable'||operation==='rotatePassword')rows_('Sessions').filter(x=>x['Staff ID']===id).forEach(x=>update_('Sessions',x,{'Expires At':'0'}));
    audit_(email,'','','','STAFF_'+operation.toUpperCase(),' ',id,existing.Username);
    return {saved:true,staffId:id};
  }finally{lock.releaseLock();}
}
function staffProfileSave_(email,p){
  const staff=rows_('Operators').find(x=>String(x.Email).toLowerCase()===email&&active_(x['Account Status']));
  if(!staff)throw new Error('Only provisioned staff profiles can be edited here.');
  const patch={Name:String(p.name||staff.Name).trim().slice(0,100),Mobile:String(p.mobile||'').slice(0,30)};
  if(!patch.Name)throw new Error('Name required.');
  update_('Operators',staff,patch);
  audit_(email,'','','','STAFF_PROFILE_UPDATED','','Saved','');
  return {saved:true};
}

function dispatch_(p){
  const action=String(p.action||'');
  const publicFns={catalogue:()=>catalogue_(),eventDetail:()=>eventDetail_(p),requestOtp:()=>requestOtp_(p),staffLogin:()=>staffLogin_(p)};
  if(publicFns[action])return {data:undefined,...(action==='staffLogin'?publicFns[action]():{data:publicFns[action]()})};
  if(action==='verifyOtp')return verifyOtp_(p);
  if(action==='bootstrapStaffSession')return bootstrapStaffSession_(p);
  const identity=verified_(p.session),email=identity.email,staff=identity.method==='STAFF';
  if(!staff&&STAFF_ACTIONS.includes(action))throw codeError_('Staff sign-in is required.','FORBIDDEN');
  if(staff&&DELEGATE_ACTIONS.includes(action))throw codeError_('Delegate sign-in is required.','FORBIDDEN');
  if(staff){
    const admin=String(PropertiesService.getScriptProperties().getProperty('BOOTSTRAP_ADMIN_EMAIL')||'').toLowerCase();
    if(identity.staffId){
      const found=rows_('Operators').find(x=>x['Operator ID']===identity.staffId&&String(x.Email).toLowerCase()===email&&active_(x['Account Status']));
      if(!found)throw codeError_('Staff account is inactive.','AUTH_REQUIRED');
    }else if(email!==admin)throw codeError_('Staff authentication is invalid.','AUTH_REQUIRED');
  }
  const actions={me:()=>me_(identity),profile:()=>profile_(email,p),badgeLookup:()=>badgeLookup_(email,p),book:()=>book_(email,p),cancelBooking:()=>cancelBooking_(email,p),myBookings:()=>myBookings_(email),qrPass:()=>({token:participantFor_(email)?.['QR Token Reference']}),adminSummary:()=>summary_(email),adminList:()=>adminList_(email,p),adminSave:()=>adminSave_(email,p),staffManage:()=>staffManage_(email,p),staffProfileSave:()=>staffProfileSave_(email,p),operatorLookup:()=>operatorLookup_(email,p),operatorUpdate:()=>operatorUpdate_(email,p),activitiesForBooking:()=>activitiesForBooking_(email,p),activityUpdate:()=>activityUpdate_(email,p)};
  if(!actions[action])throw new Error('Unknown request.');
  return {data:actions[action]()};
}
function doPost(e){try{const req=JSON.parse(e.postData.contents||'{}');const secret=PropertiesService.getScriptProperties().getProperty('API_SHARED_SECRET');if(!secret||secret.length<24)throw new Error('Backend shared secret is not configured securely.');if(String(req.secret||'')!==secret)throw codeError_('Unauthorized API request.','FORBIDDEN');const result=dispatch_(req);return json_({ok:true,...result});}catch(err){return json_({ok:false,error:String(err.message||'Unexpected backend error.'),code:err.code||'BAD_REQUEST'});}}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return ContentService.createTextOutput('MPTB Smart Excursions backend — POST only.');}
