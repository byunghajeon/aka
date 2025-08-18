import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, collection, query, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';


// --- Firebase 설정 (환경 변수에서 안전하게 가져오기) ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};
const appId = firebaseConfig.appId;

// --- 상수 정의 ---
const DRINKS_INFO = { 
    soju: { name: "소주", volume: 50, abv: 0.169 }, 
    beer: { name: "맥주", volume: 200, abv: 0.05 }, 
    somac: { name: "소맥", volume: 200, abv: 0.09 }, 
    whiskey: { name: "위스키", volume: 30, abv: 0.42 }, 
    wine: { name: "와인", volume: 100, abv: 0.13 }, 
    makgeolli: { name: "막걸리", volume: 150, abv: 0.06 },
    highball: { name: "하이볼", volume: 300, abv: 0.08 },
};
const ALCOHOL_DENSITY = 0.789;
const BAC_ELIMINATION_RATE = 0.015;
const SOJU_BOTTLE_ALCOHOL_GRAMS = 360 * 0.169 * ALCOHOL_DENSITY;

// --- Firebase 초기화 ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 헬퍼 함수 ---
const formatEventDate = (date) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : date.toDate();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('ko-KR', options).format(d);
};
const formatTime = (date) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : date.toDate();
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return new Intl.DateTimeFormat('ko-KR', options).format(d);
};
const calculateDuration = (start, end) => {
    if (!start || !end) return null;
    const startDate = start.toDate();
    const endDate = end.toDate();
    let diff = (endDate.getTime() - startDate.getTime());
    if (diff < 60000) return null;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.round((diff % 3600000) / 60000);
    let durationString = '';
    if (hours > 0) durationString += `${hours}시간 `;
    if (minutes > 0) durationString += `${minutes}분`;
    return durationString.trim();
};
const getPercentageColor = (percentage) => {
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-orange-500';
    if (percentage > 40) return 'bg-yellow-500';
    if (percentage > 20) return 'bg-green-500';
    return 'bg-blue-500';
};
const getBACStatus = (bac) => {
    if (bac >= 0.2) { return { color: 'bg-red-600', message: '면허 취소: 2~5년 징역 또는 1~2천만원 벌금' }; } 
    else if (bac >= 0.08) { return { color: 'bg-red-600', message: '면허 취소: 1~2년 징역 또는 500~1천만원 벌금' }; } 
    else if (bac >= 0.03) { return { color: 'bg-yellow-500', message: '면허 정지: 1년 이하 징역 또는 500만원 이하 벌금' }; } 
    else if (bac > 0) { return { color: 'bg-blue-600', message: '알코올이 검출되었습니다. 숙취 운전도 음주운전입니다.' }; }
    return { color: 'bg-gray-800', message: '' };
};

// *** 새로운 헬퍼 함수: 주량 대비 메시지 ***
const getPercentageMessage = (percentage) => {
    if (percentage > 140) return "정신은 안드로메다에...";
    if (percentage > 120) return "넌 이미 죽어있다.";
    if (percentage > 100) return "지금 먹는 술은 술이 먹는 술이야";
    if (percentage > 80) return "이제부터는 택시도 고려해야";
    if (percentage > 60) return "귀가 타이밍을 잡아요";
    if (percentage > 40) return "이제부터는 취했다고 보면 돼요";
    if (percentage > 20) return "가장 즐거운 시간";
    if (percentage > 0) return "이제 시작입니다.";
    return "";
};


// --- 컴포넌트 ---
const Loader = () => ( <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div></div>);
const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => ( <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm"><h2 className="text-2xl font-bold text-center mb-2">{title}</h2><p className="text-center text-gray-300 mb-6">{message}</p><div className="flex space-x-2 mt-6"><button onClick={onCancel} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">취소</button><button onClick={onConfirm} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">삭제</button></div></div></div>);
const EditSessionNameModal = ({ currentName, onSave, onClose }) => { const [eventName, setEventName] = useState(currentName); const handleSave = () => { if (!eventName.trim()) { console.error("이벤트 이름을 입력해주세요."); return; } onSave(eventName.trim()); }; return ( <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm"><h2 className="text-2xl font-bold text-center mb-4">이벤트 이름 수정</h2><input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="이벤트 이름" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" /><div className="flex space-x-2 mt-6"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">취소</button><button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">저장</button></div></div></div> );};
const ProfileModal = ({ userProfile, onSave, onClose }) => { const [name, setName] = useState(userProfile?.name || ''); const [gender, setGender] = useState(userProfile?.gender || 'male'); const [weight, setWeight] = useState(userProfile?.weight || ''); const [capacity, setCapacity] = useState(userProfile?.capacity || ''); const handleSave = () => { if (!name.trim() || !gender || !weight || weight <= 0 || !capacity || capacity <= 0) { console.error("모든 정보를 올바르게 입력해주세요."); return; } onSave({ name: name.trim(), gender, weight: parseFloat(weight), capacity: parseFloat(capacity) }); }; return ( <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm"><h2 className="text-2xl font-bold text-center mb-4">사용자 정보</h2><div className="space-y-4"><div><label htmlFor="name-input" className="font-bold">이름</label><input type="text" id="name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" /></div><div><label className="font-bold">성별</label><div className="flex justify-around mt-2"><label className="flex items-center space-x-2 p-2 rounded-lg bg-gray-700"><input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={(e) => setGender(e.target.value)} className="form-radio text-emerald-500" /><span>남성</span></label><label className="flex items-center space-x-2 p-2 rounded-lg bg-gray-700"><input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={(e) => setGender(e.target.value)} className="form-radio text-emerald-500" /><span>여성</span></label></div></div><div><label htmlFor="weight-input" className="font-bold">체중 (kg)</label><input type="number" id="weight-input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="예: 70" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" /></div><div><label htmlFor="capacity-input" className="font-bold">주량 (소주 병 기준)</label><input type="number" id="capacity-input" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="예: 2" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" /></div></div><div className="flex space-x-2 mt-6"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">닫기</button><button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">저장하기</button></div></div></div> );};
const NewSessionModal = ({ onSave, onClose }) => { const [eventName, setEventName] = useState(''); const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]); const handleSave = () => { if (!eventName.trim()) { console.error("이벤트 이름을 입력해주세요."); return; } onSave(eventName.trim(), new Date(eventDate)); }; return ( <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm"><h2 className="text-2xl font-bold text-center mb-4">새로운 술자리</h2><div className="space-y-4"><div><label htmlFor="event-name-input" className="text-sm font-bold text-gray-400">이벤트 이름</label><input type="text" id="event-name-input" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="예: 팀 회식" className="w-full mt-1 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" /></div><div><label htmlFor="event-date-input" className="text-sm font-bold text-gray-400">날짜</label><input type="date" id="event-date-input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full mt-1 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" /></div></div><div className="flex space-x-2 mt-6"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">취소</button><button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">생성하기</button></div></div></div> );};
const TimeEditModal = ({ onSave, onClose, initialTime, title }) => { const [time, setTime] = useState(initialTime); const handleSave = () => { onSave(time); onClose(); }; return ( <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm"><h2 className="text-2xl font-bold text-center mb-4">{title}</h2><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full mt-1 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" /><div className="flex space-x-2 mt-6"><button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">취소</button><button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">저장</button></div></div></div> );};
const SessionDetail = ({ userId, userProfile, sessionId, goBack, onEditClick }) => { const [session, setSession] = useState(null); const [calculation, setCalculation] = useState({ peakGrams: 0, peakBAC: 0, soberTime: null, percentage: 0 }); const [timeEditModal, setTimeEditModal] = useState({ isOpen: false, type: null }); useEffect(() => { if (!userId || !sessionId) return; const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/drinking_sessions/${sessionId}`); const unsubscribe = onSnapshot(sessionRef, (docSnap) => { if (docSnap.exists()) { setSession({ id: docSnap.id, ...docSnap.data() }); } else { goBack(); } }); return () => unsubscribe(); }, [userId, sessionId, goBack]); useEffect(() => { if (!session || !userProfile) return; const totalConsumedGrams = Object.keys(session.counts).reduce((acc, key) => (acc + (session.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0); const capacityInGrams = userProfile.capacity * SOJU_BOTTLE_ALCOHOL_GRAMS; const percentage = capacityInGrams > 0 ? (totalConsumedGrams / capacityInGrams) * 100 : 0; let peakBAC = 0, soberTime = null; if (session.startTime && totalConsumedGrams > 0) { const genderConstant = userProfile.gender === 'male' ? 0.68 : 0.55; const bodyWeightGrams = userProfile.weight * 1000; peakBAC = (totalConsumedGrams / (bodyWeightGrams * genderConstant)) * 100; const totalHoursToSober = peakBAC / BAC_ELIMINATION_RATE; soberTime = new Date(session.startTime.toDate().getTime() + totalHoursToSober * 3600000); } setCalculation({ peakGrams: totalConsumedGrams, peakBAC, soberTime, percentage }); }, [session, userProfile]); const updateSession = async (data) => { const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/drinking_sessions/${sessionId}`); await setDoc(sessionRef, data, { merge: true }); }; const handleCountChange = (drinkKey, change) => { const newCounts = { ...session.counts }; newCounts[drinkKey] = Math.max(0, (newCounts[drinkKey] || 0) + change); updateSession({ counts: newCounts }); }; const handleSaveTime = (newTime) => { const sessionDate = session.createdAt.toDate(); const [hours, minutes] = newTime.split(':'); const newDateTime = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), hours, minutes); if (timeEditModal.type === 'start') { updateSession({ startTime: newDateTime }); } else { const startTime = session.startTime.toDate(); if (newDateTime < startTime) { newDateTime.setDate(newDateTime.getDate() + 1); } updateSession({ endTime: newDateTime }); } }; const handleTimeButtonClick = (type) => { const timeExists = type === 'start' ? session.startTime : session.endTime; if (timeExists) { setTimeEditModal({ isOpen: true, type: type }); } else { const now = new Date(); if (type === 'start') { updateSession({ startTime: now }); } else if (session.startTime) { updateSession({ endTime: now }); } } }; if (!session) return <Loader />; const { percentage, peakBAC, peakGrams, soberTime } = calculation; const colorClass = getPercentageColor(percentage); const bacStatus = getBACStatus(peakBAC); const duration = calculateDuration(session.startTime, session.endTime); const percentageMessage = getPercentageMessage(percentage); return ( <div className="w-full max-w-md mx-auto pt-2 pb-32 px-2 sm:px-4 min-h-screen">{timeEditModal.isOpen && ( <TimeEditModal title={timeEditModal.type === 'start' ? '시작 시간 수정' : '종료 시간 수정'} initialTime={ (timeEditModal.type === 'start' ? session.startTime?.toDate() : session.endTime?.toDate())?.toTimeString().substring(0,5) || '19:00' } onSave={handleSaveTime} onClose={() => setTimeEditModal({ isOpen: false, type: null })} /> )}<header className="text-center py-3"><div className="flex justify-between items-center"><button onClick={goBack} className="p-2 rounded-full hover:bg-gray-800"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button><h1 className="text-2xl font-bold text-emerald-400 truncate flex-1 text-center">{session.eventName}</h1><button onClick={() => onEditClick(sessionId, session.eventName)} className="p-2 rounded-full hover:bg-gray-800"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button></div></header><div className="p-3 text-center text-gray-400"><p>{formatEventDate(session.createdAt)}</p><div className="grid grid-cols-2 gap-2 text-center mt-2"><button onClick={() => handleTimeButtonClick('start')} className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg transition">{session.startTime ? formatTime(session.startTime) : '시작'}</button><button onClick={() => handleTimeButtonClick('end')} disabled={!session.startTime} className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed">{session.endTime ? formatTime(session.endTime) : '종료'}</button></div>{duration && <p className="mt-2 text-sm">({duration})</p>}</div><main className="p-3 space-y-3">{Object.entries(DRINKS_INFO).map(([key, info]) => ( <div key={key} className="drink-item flex items-center justify-between bg-gray-800 p-4 rounded-lg"><span className="text-lg font-medium">{info.name}</span><div className="flex items-center space-x-3"><button onClick={() => handleCountChange(key, -1)} className="bg-gray-700 rounded-full w-10 h-10 text-2xl font-bold flex items-center justify-center transition-transform active:scale-90">-</button><span className="count-display text-xl font-bold text-center">{session.counts[key] || 0}잔</span><button onClick={() => handleCountChange(key, 1)} className="bg-emerald-500 rounded-full w-10 h-10 text-2xl font-bold flex items-center justify-center transition-transform active:scale-90">+</button></div></div> ))}</main><footer className="p-4 border-t-2 border-gray-800 mt-4"><div className="grid grid-cols-2 gap-4 text-center"><div className="bg-gray-800 p-3 rounded-lg"><h2 className="text-sm font-bold text-gray-400">총 섭취 알코올</h2><p className="text-2xl font-bold text-emerald-400 mt-1">{peakGrams.toFixed(1)} g</p></div><div className={`p-3 rounded-lg transition-colors duration-500 ${bacStatus.color}`}><h2 className="text-sm font-bold text-gray-200">최고 혈중알코올농도</h2><p className="text-2xl font-bold text-white mt-1">{peakBAC.toFixed(3)} %</p></div></div><div className="mt-4"><h2 className="text-sm font-bold text-gray-400 text-center mb-2">주량 대비</h2><div className="w-full bg-gray-700 rounded-full h-5"><div className={`h-5 rounded-full text-center text-white text-xs font-bold flex items-center justify-center transition-all duration-300 ease-in-out ${colorClass}`} style={{ width: `${Math.min(100, percentage)}%` }}><span>{Math.round(percentage)}%</span></div></div><p className="text-center text-lg font-semibold text-gray-300 mt-2 h-6">{percentageMessage}</p></div><p className="text-center text-sm text-yellow-400 mt-2 h-4">{bacStatus.message}</p><div className="bg-gray-800 p-3 rounded-lg text-center mt-4"><h2 className="text-sm font-bold text-gray-400">분해 완료 예상</h2><p className="text-xl font-bold text-white mt-1">{soberTime ? `${formatTime(soberTime)} (${formatEventDate(soberTime)})` : '-'}</p></div></footer></div> );};
const SessionListItem = ({ session, userProfile, onSelectSession, onDeleteClick }) => { const [remainingDetoxTime, setRemainingDetoxTime] = useState(''); useEffect(() => { if (!session.endTime || !session.startTime || !userProfile) { setRemainingDetoxTime(''); return; } const calculate = () => { const totalConsumedGrams = Object.keys(session.counts).reduce((acc, key) => (acc + (session.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0); const genderConstant = userProfile.gender === 'male' ? 0.68 : 0.55; const bodyWeightGrams = userProfile.weight * 1000; const peakBAC = (totalConsumedGrams / (bodyWeightGrams * genderConstant)) * 100; const totalHoursToSober = peakBAC / BAC_ELIMINATION_RATE; const soberUpDate = new Date(session.startTime.toDate().getTime() + totalHoursToSober * 3600000); const remainingMillis = soberUpDate.getTime() - new Date().getTime(); if (remainingMillis > 0) { const hours = Math.floor(remainingMillis / 3600000); const minutes = Math.round((remainingMillis % 3600000) / 60000); setRemainingDetoxTime(`해독까지 ${hours}시간 ${minutes}분 남음`); } else { setRemainingDetoxTime(''); } }; calculate(); const interval = setInterval(calculate, 60000); return () => clearInterval(interval); }, [session, userProfile]); const duration = calculateDuration(session.startTime, session.endTime); const colorClass = getPercentageColor(session.peakPercentage); const handleDelete = (e) => { e.stopPropagation(); onDeleteClick(session.id); }; return ( <div onClick={() => onSelectSession(session.id)} className="bg-gray-800 p-4 rounded-lg flex items-center cursor-pointer hover:bg-gray-700 transition-colors group"><div className="flex-grow"><p className="font-bold text-lg">{session.eventName}</p><p className="text-sm text-gray-400">{formatEventDate(session.createdAt)}{duration && <span className="ml-2 text-yellow-400">{`(${duration})`}</span>}</p>{remainingDetoxTime && <p className="text-xs text-cyan-400 mt-1">{remainingDetoxTime}</p>}</div>{session.peakPercentage != null && ( <div className="text-right flex flex-col items-end mr-4"><span className={`px-3 py-1 text-sm font-bold rounded-full text-white ${colorClass}`}>{Math.round(session.peakPercentage)}%</span><p className="text-xs text-gray-400 mt-1">주량 대비</p></div> )}<button onClick={handleDelete} className="p-2 rounded-full text-gray-500 hover:bg-red-900 hover:text-white transition-all opacity-0 group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></div> );};
const AuthScreen = ({ onAuthSuccess }) => { const [isLogin, setIsLogin] = useState(true); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const handleSubmit = async (e) => { e.preventDefault(); setError(''); try { if (isLogin) { await signInWithEmailAndPassword(auth, email, password); } else { await createUserWithEmailAndPassword(auth, email, password); } } catch (err) { setError(err.message); } }; return ( <div className="w-full max-w-md mx-auto pt-10 px-4"><header className="text-center mb-8"><h1 className="text-4xl font-bold text-emerald-400">안티코알라 🐨</h1><p className="text-gray-400 mt-2">당신의 건강한 음주 생활을 위해</p></header><div className="bg-gray-800 p-6 rounded-lg"><div className="flex border-b border-gray-700 mb-4"><button onClick={() => setIsLogin(true)} className={`w-1/2 py-2 font-bold ${isLogin ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'}`}>로그인</button><button onClick={() => setIsLogin(false)} className={`w-1/2 py-2 font-bold ${!isLogin ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'}`}>회원가입</button></div><form onSubmit={handleSubmit} className="space-y-4"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" required className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" autoComplete="email" /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호 (6자 이상)" required className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" autoComplete="current-password"/><button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition">{isLogin ? '로그인' : '회원가입'}</button>{error && <p className="text-red-500 text-sm text-center">{error}</p>}</form></div></div> );};
const SessionList = ({ sessions, userProfile, onSelectSession, onCreateSession, onProfileClick, onDeleteClick, onLogout }) => { return ( <div className="w-full max-w-md mx-auto pt-2 px-2 sm:px-4 pb-20"> <header className="text-center py-3"> <div className="flex justify-between items-center px-2"> <div className="flex items-center"> <h1 className="text-3xl sm:text-4xl font-bold text-emerald-400">안티코알라</h1> <span className="text-3xl ml-2">🐨</span> </div> <div className="flex items-center space-x-2"> <button onClick={onProfileClick} className="p-2 rounded-full hover:bg-gray-800"> <div className="flex items-center space-x-2"> <span className="text-white font-semibold">{userProfile?.name}</span> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> </div> </button> <button onClick={onLogout} title="로그아웃" className="p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> </button> </div> </div> </header> <div className="px-2 my-4"> <button onClick={onCreateSession} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-lg text-lg transition-transform active:scale-95">+ 새로운 술자리</button> </div> <main className="space-y-3"> {sessions.length === 0 ? ( <div className="text-center text-gray-500 mt-16"> <p className="text-lg">아직 기록이 없네요.</p> <p>상단의 버튼을 눌러 첫 술자리를 기록해보세요!</p> </div> ) : ( sessions.map(session => ( <SessionListItem key={session.id} session={session} userProfile={userProfile} onSelectSession={onSelectSession} onDeleteClick={onDeleteClick} /> )) )} </main> </div> );};

const StatsPage = ({ sessions, userProfile }) => {
    const [period, setPeriod] = useState('monthly');
    const [currentDate, setCurrentDate] = useState(new Date());

    const getFilteredSessions = () => {
        const year = currentDate.getFullYear();
        if (period === 'yearly') {
            return sessions.filter(s => s.createdAt.toDate().getFullYear() === year);
        }
        if (period === 'quarterly') {
            const quarter = Math.floor(currentDate.getMonth() / 3);
            return sessions.filter(s => {
                const d = s.createdAt.toDate();
                return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter;
            });
        }
        // monthly
        const month = currentDate.getMonth();
        return sessions.filter(s => {
            const d = s.createdAt.toDate();
            return d.getFullYear() === year && d.getMonth() === month;
        });
    };

    const filteredSessions = getFilteredSessions();

    const processDataForChart = () => {
        if (period === 'yearly') {
            const monthlyData = Array(12).fill(0).map((_, i) => ({ name: `${i + 1}월`, total: 0 }));
            filteredSessions.forEach(s => {
                const month = s.createdAt.toDate().getMonth();
                const sessionGrams = Object.keys(s.counts).reduce((acc, key) => (acc + (s.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0);
                monthlyData[month].total += sessionGrams;
            });
            return monthlyData;
        }
        if (period === 'quarterly') {
            const startMonth = Math.floor(currentDate.getMonth() / 3) * 3;
            const monthlyData = Array(3).fill(0).map((_, i) => ({ name: `${startMonth + i + 1}월`, total: 0 }));
             filteredSessions.forEach(s => {
                const month = s.createdAt.toDate().getMonth();
                const sessionGrams = Object.keys(s.counts).reduce((acc, key) => (acc + (s.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0);
                monthlyData[month % 3].total += sessionGrams;
            });
            return monthlyData;
        }
        // monthly
        const weeklyData = [ { name: '1주차', total: 0 }, { name: '2주차', total: 0 }, { name: '3주차', total: 0 }, { name: '4주차', total: 0 }, { name: '5주차', total: 0 }];
        filteredSessions.forEach(s => {
            const weekOfMonth = Math.floor((s.createdAt.toDate().getDate() - 1) / 7);
            if(weeklyData[weekOfMonth]) {
                const sessionGrams = Object.keys(s.counts).reduce((acc, key) => (acc + (s.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0);
                weeklyData[weekOfMonth].total += sessionGrams;
            }
        });
        return weeklyData;
    };

    const chartData = processDataForChart();
    const totalDrinkingDays = filteredSessions.length;
    const totalAlcoholGrams = filteredSessions.reduce((total, session) => {
        const sessionGrams = Object.keys(session.counts).reduce((acc, key) => (acc + (session.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0);
        return total + sessionGrams;
    }, 0);
    const averageAlcoholGrams = totalDrinkingDays > 0 ? (totalAlcoholGrams / totalDrinkingDays) : 0;
    
    return (
        <div className="w-full max-w-md mx-auto pt-2 px-2 sm:px-4 pb-20">
            <header className="text-center py-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-emerald-400">음주 기록 통계</h1>
            </header>
            <main className="space-y-4 mt-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-center space-x-2 mb-4">
                        <button onClick={() => setPeriod('monthly')} className={`px-3 py-1 rounded-full text-sm font-bold ${period === 'monthly' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}>월간</button>
                        <button onClick={() => setPeriod('quarterly')} className={`px-3 py-1 rounded-full text-sm font-bold ${period === 'quarterly' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}>분기</button>
                        <button onClick={() => setPeriod('yearly')} className={`px-3 py-1 rounded-full text-sm font-bold ${period === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}>연간</button>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                <XAxis dataKey="name" stroke="#A0AEC0" />
                                <YAxis stroke="#A0AEC0" />
                                <Tooltip cursor={{fill: 'rgba(74, 85, 104, 0.5)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568', borderRadius: '0.5rem' }} labelStyle={{ color: '#E2E8F0' }} />
                                <Bar dataKey="total" fill="#48BB78" name="총 알코올 (g)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 border-t border-gray-700 pt-4 text-sm">
                        <div className="flex justify-between py-1"><span className="text-gray-400">음주 횟수:</span> <strong className="text-white">{totalDrinkingDays}회</strong></div>
                        <div className="flex justify-between py-1"><span className="text-gray-400">총 섭취량:</span> <strong className="text-white">{totalAlcoholGrams.toFixed(1)}g</strong></div>
                        <div className="flex justify-between py-1"><span className="text-gray-400">평균 섭취량:</span> <strong className="text-white">{averageAlcoholGrams.toFixed(1)}g</strong></div>
                    </div>
                </div>
                <Calendar
                    onChange={setCurrentDate}
                    value={currentDate}
                    tileContent={({ date, view }) => view === 'month' && new Set(sessions.map(s => s.createdAt.toDate().toDateString())).has(date.toDateString()) ? <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mx-auto mt-1"></div> : null}
                    formatDay={(locale, date) => date.getDate()}
                    prev2Label={null}
                    next2Label={null}
                />
            </main>
        </div>
    );
};

const BottomNav = ({ currentView, setView }) => { return ( <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-gray-800 border-t border-gray-700"><div className="flex justify-around"><button onClick={() => setView('list')} className={`flex-1 py-3 text-center ${currentView === 'list' ? 'text-emerald-400' : 'text-gray-400'}`}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>기록</button><button onClick={() => setView('stats')} className={`flex-1 py-3 text-center ${currentView === 'stats' ? 'text-emerald-400' : 'text-gray-400'}`}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1"><path d="M12 20v-6M12 14V4M6 20v-2M6 18V4M18 20v-4M18 16V4"/></svg>통계</button></div></div> );};


export default function App() {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [view, setView] = useState('list'); 
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [deleteModalInfo, setDeleteModalInfo] = useState({ isOpen: false, sessionId: null });
    const [editNameModalInfo, setEditNameModalInfo] = useState({ isOpen: false, sessionId: null, currentName: '' });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user); 
            setIsAuthReady(true); 
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) { 
            setUserProfile(null);
            setSessions([]);
            return;
        };
        
        const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile/user_data`);
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
                setShowProfileModal(false);
            } else {
                setShowProfileModal(true);
            }
        });

        const sessionsQuery = query(collection(db, `artifacts/${appId}/users/${user.uid}/drinking_sessions`));
        const unsubSessions = onSnapshot(sessionsQuery, (querySnapshot) => {
            const sessionsData = [];
            querySnapshot.forEach((doc) => { sessionsData.push({ id: doc.id, ...doc.data() }); });
            sessionsData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
            setSessions(sessionsData);
        });

        return () => { unsubProfile(); unsubSessions(); };
    }, [user]); 

    const handleSaveProfile = async (profileData) => {
        if (!user) return;
        const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile/user_data`);
        await setDoc(profileRef, profileData);
        setUserProfile(profileData);
        setShowProfileModal(false);
    };

    const handleCreateSession = async (eventName, eventDate) => {
        if (!user) return;
        const newSession = {
            eventName,
            createdAt: eventDate,
            startTime: null,
            endTime: null,
            counts: Object.keys(DRINKS_INFO).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
            peakPercentage: null,
        };
        const sessionRef = await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/drinking_sessions`), newSession);
        setCurrentSessionId(sessionRef.id);
        setShowNewSessionModal(false);
        setView('detail');
    };
    
    const handleDeleteClick = (sessionId) => {
        setDeleteModalInfo({ isOpen: true, sessionId: sessionId });
    };

    const confirmDeleteSession = async () => {
        if (!user || !deleteModalInfo.sessionId) return;
        const sessionRef = doc(db, `artifacts/${appId}/users/${user.uid}/drinking_sessions/${deleteModalInfo.sessionId}`);
        try {
            await deleteDoc(sessionRef);
        } catch (error) {
            console.error("세션 삭제 중 오류 발생: ", error);
        }
        setDeleteModalInfo({ isOpen: false, sessionId: null });
    };

    const handleEditNameClick = (sessionId, currentName) => {
        setEditNameModalInfo({ isOpen: true, sessionId: sessionId, currentName: currentName });
    };
    
    const handleSaveEventName = async (newName) => {
        if (!user || !editNameModalInfo.sessionId || !newName.trim()) return;
        const sessionRef = doc(db, `artifacts/${appId}/users/${user.uid}/drinking_sessions/${editNameModalInfo.sessionId}`);
        try {
            await updateDoc(sessionRef, { eventName: newName.trim() });
        } catch (error) {
            console.error("이벤트 이름 업데이트 중 오류 발생: ", error);
        }
        setEditNameModalInfo({ isOpen: false, sessionId: null, currentName: '' });
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    if (!isAuthReady) return <Loader />;

    const renderMainContent = () => {
        switch (view) {
            case 'list':
                return (
                    <SessionList 
                        sessions={sessions} 
                        userProfile={userProfile}
                        onSelectSession={(id) => { setCurrentSessionId(id); setView('detail'); }} 
                        onCreateSession={() => setShowNewSessionModal(true)}
                        onProfileClick={() => setShowProfileModal(true)}
                        onDeleteClick={handleDeleteClick}
                        onLogout={handleLogout} 
                    />
                );
            case 'stats':
                return (
                    <StatsPage sessions={sessions} userProfile={userProfile} />
                );
            case 'detail':
                return (
                    currentSessionId && <SessionDetail 
                        userId={user.uid} 
                        userProfile={userProfile} 
                        sessionId={currentSessionId} 
                        goBack={() => setView('list')} 
                        onEditClick={handleEditNameClick}
                    />
                );
            default:
                return <SessionList sessions={sessions} userProfile={userProfile} onSelectSession={(id) => { setCurrentSessionId(id); setView('detail'); }} onCreateSession={() => setShowNewSessionModal(true)} onProfileClick={() => setShowProfileModal(true)} onDeleteClick={handleDeleteClick} onLogout={handleLogout} />;
        }
    };

    return (
        <div className="bg-black text-white min-h-screen font-sans">
            {!user ? (
                <AuthScreen />
            ) : (
                <>
                    {showProfileModal && <ProfileModal userProfile={userProfile} onSave={handleSaveProfile} onClose={() => { if(userProfile) setShowProfileModal(false) }} />}
                    {showNewSessionModal && <NewSessionModal onSave={handleCreateSession} onClose={() => setShowNewSessionModal(false)} />}
                    {deleteModalInfo.isOpen && (
                        <ConfirmationModal 
                            title="기록 삭제"
                            message="정말로 이 술자리 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                            onConfirm={confirmDeleteSession}
                            onCancel={() => setDeleteModalInfo({ isOpen: false, sessionId: null })}
                        />
                    )}
                    {editNameModalInfo.isOpen && (
                        <EditSessionNameModal
                            currentName={editNameModalInfo.currentName}
                            onSave={handleSaveEventName}
                            onClose={() => setEditNameModalInfo({ isOpen: false, sessionId: null, currentName: '' })}
                        />
                    )}
                    
                    {renderMainContent()}
                    {view !== 'detail' && <BottomNav currentView={view} setView={setView} />}
                </>
            )}
        </div>
    );
}
