import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, collection, query, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// --- Firebase 설정 (환경 변수에서 가져옴) ---
const firebaseConfig = {
  apiKey: "AIzaSyABC1Zjb3YSZQQ4XhVDMfWPDJ_DVrmG590",
  authDomain: "anti-koala.firebaseapp.com",
  projectId: "anti-koala",
  storageBucket: "anti-koala.firebasestorage.app",
  messagingSenderId: "239731379993",
  appId: "1:239731379993:web:6276a83da7ea3c1cc5bf88",
  measurementId: "G-R3HP04H1WM"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- 상수 정의 ---
const DRINKS_INFO = { soju: { name: "소주", volume: 50, abv: 0.169 }, beer: { name: "맥주", volume: 200, abv: 0.05 }, somac: { name: "소맥", volume: 200, abv: 0.09 }, whiskey: { name: "위스키", volume: 30, abv: 0.40 }, wine: { name: "와인", volume: 125, abv: 0.13 }, makgeolli: { name: "막걸리", volume: 150, abv: 0.06 } };
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


// --- 컴포넌트 ---

const Loader = () => (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
    </div>
);

const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-2xl font-bold text-center mb-2">{title}</h2>
            <p className="text-center text-gray-300 mb-6">{message}</p>
            <div className="flex space-x-2 mt-6">
                <button onClick={onCancel} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">취소</button>
                <button onClick={onConfirm} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">삭제</button>
            </div>
        </div>
    </div>
);

const EditSessionNameModal = ({ currentName, onSave, onClose }) => {
    const [eventName, setEventName] = useState(currentName);

    const handleSave = () => {
        if (!eventName.trim()) {
            console.error("이벤트 이름을 입력해주세요.");
            return;
        }
        onSave(eventName.trim());
    };

    return (
        <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center mb-4">이벤트 이름 수정</h2>
                <input 
                    type="text" 
                    value={eventName} 
                    onChange={(e) => setEventName(e.target.value)} 
                    placeholder="이벤트 이름" 
                    className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" 
                />
                <div className="flex space-x-2 mt-6">
                    <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">취소</button>
                    <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">저장</button>
                </div>
            </div>
        </div>
    );
};


const ProfileModal = ({ userProfile, onSave, onClose }) => {
    const [name, setName] = useState(userProfile?.name || '');
    const [gender, setGender] = useState(userProfile?.gender || 'male');
    const [weight, setWeight] = useState(userProfile?.weight || '');
    const [capacity, setCapacity] = useState(userProfile?.capacity || '');

    const handleSave = () => {
        if (!name.trim() || !gender || !weight || weight <= 0 || !capacity || capacity <= 0) {
            console.error("모든 정보를 올바르게 입력해주세요.");
            return;
        }
        onSave({ name: name.trim(), gender, weight: parseFloat(weight), capacity: parseFloat(capacity) });
    };

    return (
        <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center mb-4">사용자 정보</h2>
                <div className="space-y-4">
                        <div>
                            <label htmlFor="name-input" className="font-bold">이름</label>
                            <input type="text" id="name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="font-bold">성별</label>
                            <div className="flex justify-around mt-2">
                                <label className="flex items-center space-x-2 p-2 rounded-lg bg-gray-700"><input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={(e) => setGender(e.target.value)} className="form-radio text-emerald-500" /><span>남성</span></label>
                                <label className="flex items-center space-x-2 p-2 rounded-lg bg-gray-700"><input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={(e) => setGender(e.target.value)} className="form-radio text-emerald-500" /><span>여성</span></label>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="weight-input" className="font-bold">체중 (kg)</label>
                            <input type="number" id="weight-input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="예: 70" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label htmlFor="capacity-input" className="font-bold">주량 (소주 병 기준)</label>
                            <input type="number" id="capacity-input" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="예: 2" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" />
                        </div>
                </div>
                <div className="flex space-x-2 mt-6">
                    <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">닫기</button>
                    <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">저장하기</button>
                </div>
            </div>
        </div>
    );
};

const NewSessionModal = ({ onSave, onClose }) => {
    const [eventName, setEventName] = useState('');

    const handleSave = () => {
        if (!eventName.trim()) {
            console.error("이벤트 이름을 입력해주세요.");
            return;
        }
        onSave(eventName.trim());
    };

    return (
        <div className="modal is-open fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center mb-4">새로운 술자리</h2>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="이벤트 이름 (예: 팀 회식)" className="w-full mt-2 bg-gray-700 p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-emerald-500" />
                <div className="flex space-x-2 mt-6">
                    <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition">취소</button>
                    <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">생성하기</button>
                </div>
            </div>
        </div>
    );
};

const SessionDetail = ({ userId, userProfile, sessionId, goBack, onEditClick }) => {
    const [session, setSession] = useState(null);
    const [calculation, setCalculation] = useState({ currentGrams: 0, currentBAC: 0, soberTime: null, percentage: 0 });

    useEffect(() => {
        if (!userId || !sessionId) return;
        const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/drinking_sessions/${sessionId}`);
        const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                setSession({ id: docSnap.id, ...docSnap.data() });
            } else {
                goBack();
            }
        });
        return () => unsubscribe();
    }, [userId, sessionId, goBack]);

    useEffect(() => {
        if (!session || !userProfile) return;

        const interval = setInterval(() => {
            const totalConsumedGrams = Object.keys(session.counts).reduce((acc, key) => (acc + (session.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0);
            const capacityInGrams = userProfile.capacity * SOJU_BOTTLE_ALCOHOL_GRAMS;
            const percentage = capacityInGrams > 0 ? (totalConsumedGrams / capacityInGrams) * 100 : 0;

            let currentGrams = totalConsumedGrams, currentBAC = 0, soberTime = null;

            if (session.startTime) {
                const startTime = session.startTime.toDate();
                const genderConstant = userProfile.gender === 'male' ? 0.68 : 0.55;
                const bodyWeightGrams = userProfile.weight * 1000;
                const peakBAC = (totalConsumedGrams / (bodyWeightGrams * genderConstant)) * 100;
                const elapsedHours = (new Date() - startTime) / 3600000;
                const eliminatedBAC = BAC_ELIMINATION_RATE * elapsedHours;
                currentBAC = Math.max(0, peakBAC - eliminatedBAC);
                currentGrams = currentBAC > 0 ? (currentBAC / 100) * (bodyWeightGrams * genderConstant) : 0;

                if (currentBAC > 0) {
                    const totalHoursToSober = peakBAC / BAC_ELIMINATION_RATE;
                    soberTime = new Date(startTime.getTime() + totalHoursToSober * 3600000);
                }
            }
            setCalculation({ currentGrams, currentBAC, soberTime, percentage });
        }, 1000);

        return () => clearInterval(interval);
    }, [session, userProfile]);

    const updateSession = async (data) => {
        const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/drinking_sessions/${sessionId}`);
        await setDoc(sessionRef, data, { merge: true });
    };

    const handleCountChange = (drinkKey, change) => {
        const newCounts = { ...session.counts };
        newCounts[drinkKey] = Math.max(0, (newCounts[drinkKey] || 0) + change);
        updateSession({ counts: newCounts });
    };

    const handleStart = () => updateSession({ startTime: new Date() });
    const handleEnd = () => updateSession({ endTime: new Date(), peakPercentage: calculation.percentage });
    const handleReopen = () => updateSession({ endTime: null, peakPercentage: null });


    if (!session) return <Loader />;

    const { percentage } = calculation;
    let colorClass = getPercentageColor(percentage);
    let message;
    if (percentage > 100) { message = "제발 집에 가자"; }
    else if (percentage > 80) { message = "꼭 택시 불러서 집에 가, 집에 간다고 연락하고"; }
    else if (percentage > 60) { message = "많이 취했어 이제 가야돼"; }
    else if (percentage > 40) { message = "기분좋게 취했어, 집에 갈 준비 하자"; }
    else if (percentage > 20) { message = "아직은 괜찮아"; }
    else if (percentage > 0) { message = "오랜만에 반갑습니다"; }
    else { message = ''; }

    return (
        <div className="w-full max-w-md mx-auto pt-2 pb-32 px-2 sm:px-4 min-h-screen">
            <header className="text-center py-3">
                <div className="flex justify-between items-center">
                    <button onClick={goBack} className="p-2 rounded-full hover:bg-gray-800"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button>
                    <h1 className="text-2xl font-bold text-emerald-400 truncate flex-1 text-center">{session.eventName}</h1>
                    <button onClick={() => onEditClick(sessionId, session.eventName)} className="p-2 rounded-full hover:bg-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                </div>
            </header>
            <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <button onClick={handleStart} disabled={!!session.startTime} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed">시작: {session.startTime ? formatTime(session.startTime) : ''}</button>
                    {session.endTime ? (
                         <button onClick={handleReopen} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition">다시 시작</button>
                    ) : (
                         <button onClick={handleEnd} disabled={!session.startTime} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed">종료</button>
                    )}
                </div>
            </div>
            <main className="p-3 space-y-3">
                {Object.entries(DRINKS_INFO).map(([key, info]) => (
                    <div key={key} className="drink-item flex items-center justify-between bg-gray-800 p-4 rounded-lg"><span className="text-lg font-medium">{info.name}</span><div className="flex items-center space-x-3"><button onClick={() => handleCountChange(key, -1)} className="bg-gray-700 rounded-full w-10 h-10 text-2xl font-bold flex items-center justify-center transition-transform active:scale-90">-</button><span className="count-display text-xl font-bold text-center">{session.counts[key] || 0}잔</span><button onClick={() => handleCountChange(key, 1)} className="bg-emerald-500 rounded-full w-10 h-10 text-2xl font-bold flex items-center justify-center transition-transform active:scale-90">+</button></div></div>
                ))}
            </main>
            <footer className="p-4 border-t-2 border-gray-800 mt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-800 p-3 rounded-lg"><h2 className="text-sm font-bold text-gray-400">현재 체내 알코올</h2><p className="text-2xl font-bold text-emerald-400 mt-1">{calculation.currentGrams.toFixed(1)} g</p></div>
                    <div className="bg-gray-800 p-3 rounded-lg"><h2 className="text-sm font-bold text-gray-400">혈중알코올농도</h2><p className="text-2xl font-bold text-emerald-400 mt-1">{calculation.currentBAC.toFixed(3)} %</p></div>
                </div>
                <div className="mt-4"><h2 className="text-sm font-bold text-gray-400 text-center mb-2">주량 대비</h2><div className="w-full bg-gray-700 rounded-full h-5"><div className={`h-5 rounded-full text-center text-white text-xs font-bold flex items-center justify-center transition-all duration-300 ease-in-out ${colorClass}`} style={{ width: `${Math.min(100, percentage)}%` }}><span>{Math.round(percentage)}%</span></div></div><p className="text-center text-sm text-gray-300 mt-2 h-4">{message}</p></div>
                <div className="bg-gray-800 p-3 rounded-lg text-center mt-4"><h2 className="text-sm font-bold text-gray-400">분해 완료 예상</h2><p className="text-xl font-bold text-white mt-1">{calculation.soberTime ? `${formatTime(calculation.soberTime)} (${formatEventDate(calculation.soberTime)})` : (session.startTime ? '분해 완료!' : '-')}</p></div>
            </footer>
        </div>
    );
};

const SessionListItem = ({ session, userProfile, onSelectSession, onDeleteClick }) => {
    const [remainingDetoxTime, setRemainingDetoxTime] = useState('');

    useEffect(() => {
        if (!session.endTime || !session.startTime || !userProfile) {
            setRemainingDetoxTime('');
            return;
        }

        const calculate = () => {
            const totalConsumedGrams = Object.keys(session.counts).reduce((acc, key) => (acc + (session.counts[key] * DRINKS_INFO[key].volume * DRINKS_INFO[key].abv * ALCOHOL_DENSITY)), 0);
            const genderConstant = userProfile.gender === 'male' ? 0.68 : 0.55;
            const bodyWeightGrams = userProfile.weight * 1000;
            const peakBAC = (totalConsumedGrams / (bodyWeightGrams * genderConstant)) * 100;
            const totalHoursToSober = peakBAC / BAC_ELIMINATION_RATE;
            const soberUpDate = new Date(session.startTime.toDate().getTime() + totalHoursToSober * 3600000);
            
            const remainingMillis = soberUpDate.getTime() - new Date().getTime();

            if (remainingMillis > 0) {
                const hours = Math.floor(remainingMillis / 3600000);
                const minutes = Math.round((remainingMillis % 3600000) / 60000);
                setRemainingDetoxTime(`해독까지 ${hours}시간 ${minutes}분 남음`);
            } else {
                setRemainingDetoxTime('');
            }
        };

        calculate();
        const interval = setInterval(calculate, 60000);
        return () => clearInterval(interval);

    }, [session, userProfile]);

    const duration = calculateDuration(session.startTime, session.endTime);
    const colorClass = getPercentageColor(session.peakPercentage);

    const handleDelete = (e) => {
        e.stopPropagation();
        onDeleteClick(session.id);
    };

    return (
        <div onClick={() => onSelectSession(session.id)} className="bg-gray-800 p-4 rounded-lg flex items-center cursor-pointer hover:bg-gray-700 transition-colors group">
            <div className="flex-grow">
                <p className="font-bold text-lg">{session.eventName}</p>
                <p className="text-sm text-gray-400">
                    {formatEventDate(session.createdAt)}
                    {duration && <span className="ml-2 text-yellow-400">{`(${duration})`}</span>}
                </p>
                {remainingDetoxTime && <p className="text-xs text-cyan-400 mt-1">{remainingDetoxTime}</p>}
            </div>
            {session.peakPercentage != null && (
                <div className="text-right flex flex-col items-end mr-4">
                    <span className={`px-3 py-1 text-sm font-bold rounded-full text-white ${colorClass}`}>
                        {Math.round(session.peakPercentage)}%
                    </span>
                    <p className="text-xs text-gray-400 mt-1">주량 대비</p>
                </div>
            )}
            <button onClick={handleDelete} className="p-2 rounded-full text-gray-500 hover:bg-red-900 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    );
};

const SessionList = ({ sessions, userProfile, onSelectSession, onCreateSession, onProfileClick, onDeleteClick }) => {
    return (
        <div className="w-full max-w-md mx-auto pt-2 px-2 sm:px-4">
             <header className="text-center py-3">
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-center">
                        <h1 className="text-3xl sm:text-4xl font-bold text-emerald-400">안티코알라</h1>
                        <span className="text-3xl ml-2">🐨</span>
                    </div>
                    <button onClick={onProfileClick} className="p-2 rounded-full hover:bg-gray-800">
                        <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold">{userProfile?.name}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                    </button>
                </div>
            </header>
            
            <div className="px-2 my-4">
                <button onClick={onCreateSession} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-lg text-lg transition-transform active:scale-95">+ 새로운 술자리</button>
            </div>

            <main className="space-y-3 pb-20">
                {sessions.length === 0 ? (
                    <div className="text-center text-gray-500 mt-16">
                        <p className="text-lg">아직 기록이 없네요.</p>
                        <p>상단의 버튼을 눌러 첫 술자리를 기록해보세요!</p>
                    </div>
                ) : (
                    sessions.map(session => (
                       <SessionListItem 
                         key={session.id} 
                         session={session} 
                         userProfile={userProfile} 
                         onSelectSession={onSelectSession}
                         onDeleteClick={onDeleteClick}
                       />
                    ))
                )}
            </main>
        </div>
    );
};

export default function App() {
    const [userId, setUserId] = useState(null);
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                    if (token) await signInWithCustomToken(auth, token); else await signInAnonymously(auth);
                } catch (error) { console.error("Authentication error", error); }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!userId) return;
        
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/user_data`);
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
                setShowProfileModal(false);
            } else {
                setShowProfileModal(true);
            }
            setIsAuthReady(true);
        });

        const sessionsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/drinking_sessions`));
        const unsubSessions = onSnapshot(sessionsQuery, (querySnapshot) => {
            const sessionsData = [];
            querySnapshot.forEach((doc) => { sessionsData.push({ id: doc.id, ...doc.data() }); });
            sessionsData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
            setSessions(sessionsData);
        });

        return () => { unsubProfile(); unsubSessions(); };
    }, [userId]);

    const handleSaveProfile = async (profileData) => {
        if (!userId) return;
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/user_data`);
        await setDoc(profileRef, profileData);
        setUserProfile(profileData);
        setShowProfileModal(false);
    };

    const handleCreateSession = async (eventName) => {
        if (!userId) return;
        const newSession = {
            eventName,
            createdAt: new Date(),
            counts: Object.keys(DRINKS_INFO).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
            startTime: null, endTime: null, peakPercentage: null,
        };
        const sessionRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/drinking_sessions`), newSession);
        setCurrentSessionId(sessionRef.id);
        setShowNewSessionModal(false);
        setView('detail');
    };
    
    const handleDeleteClick = (sessionId) => {
        setDeleteModalInfo({ isOpen: true, sessionId: sessionId });
    };

    const confirmDeleteSession = async () => {
        if (!userId || !deleteModalInfo.sessionId) return;
        const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/drinking_sessions/${deleteModalInfo.sessionId}`);
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
        if (!userId || !editNameModalInfo.sessionId || !newName.trim()) return;
        const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/drinking_sessions/${editNameModalInfo.sessionId}`);
        try {
            await updateDoc(sessionRef, { eventName: newName.trim() });
        } catch (error) {
            console.error("이벤트 이름 업데이트 중 오류 발생: ", error);
        }
        setEditNameModalInfo({ isOpen: false, sessionId: null, currentName: '' });
    };


    if (!isAuthReady) return <Loader />;

    return (
        <div className="bg-black text-white min-h-screen font-sans">
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
            
            {view === 'list' ? (
                <SessionList 
                    sessions={sessions} 
                    userProfile={userProfile}
                    onSelectSession={(id) => { setCurrentSessionId(id); setView('detail'); }} 
                    onCreateSession={() => setShowNewSessionModal(true)}
                    onProfileClick={() => setShowProfileModal(true)}
                    onDeleteClick={handleDeleteClick}
                />
            ) : (
                currentSessionId && <SessionDetail 
                    userId={userId} 
                    userProfile={userProfile} 
                    sessionId={currentSessionId} 
                    goBack={() => setView('list')} 
                    onEditClick={handleEditNameClick}
                />
            )}
        </div>
    );
}
