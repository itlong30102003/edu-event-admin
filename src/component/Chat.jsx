import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Message.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [userName, setUserName] = useState('Người dùng');

  const navigate = useNavigate();
  const { state } = useLocation();
  const { currentUserId, userId } = state || {}; // organizer là currentUserId, user là người nhận

  // Kiểm tra thiếu thông tin
  if (!currentUserId || !userId) {
    return <div>Không tìm thấy thông tin người dùng.</div>;
  }

  // Tạo chatId chuẩn hóa để không bị tạo trùng
  const chatId = [currentUserId, userId].sort().join('_');

  // Lấy tên người dùng (người nhận tin nhắn)
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || 'Người dùng');
        }
      } catch (error) {
        console.error('Lỗi khi lấy tên người dùng:', error);
      }
    };

    fetchUserName();
  }, [userId]);

  // Tạo chat nếu chưa có + đọc tin nhắn
  useEffect(() => {
    const chatRef = doc(db, 'chats', chatId);

    const initChat = async () => {
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [currentUserId, userId],
          createdAt: new Date(),
          unreadCount: {
            [currentUserId]: 0,
            [userId]: 0,
          },
        });
      } else {
        await updateDoc(chatRef, {
          [`unreadCount.${currentUserId}`]: 0,
        });
      }
    };

    initChat();

    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgList);
      setTimeout(() => {
        const container = document.querySelector('.messages-list');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId, currentUserId]);

  // Gửi tin nhắn văn bản hoặc ảnh
  const sendMessage = async (imageUrl = null) => {
    if (!inputText && !imageUrl) return;

    const message = {
      senderId: currentUserId,
      text: inputText,
      imageUrl: imageUrl || null,
      createdAt: new Date(),
    };

    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    const unread = (chatDoc.exists() && chatDoc.data().unreadCount?.[userId]) || 0;

    await addDoc(collection(db, 'chats', chatId, 'messages'), message);

    await updateDoc(chatRef, {
      lastMessage: inputText || '[image]',
      [`unreadCount.${userId}`]: unread + 1, // User là người nhận nên được tăng
    });

    setInputText('');
    setSelectedFile(null);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `chat_images/${chatId}/${filename}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    sendMessage(downloadURL);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      handleImageUpload(file);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <span className="material-icons back-icon">arrow_back</span>
        </button>
        <h2>Chat với {userName}</h2>
      </div>

      <div className="messages-list">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-item ${message.senderId === currentUserId ? 'message-me' : 'message-other'}`}
            >
              {message.imageUrl && (
                <img
                  src={message.imageUrl}
                  alt="Hình ảnh"
                  className="message-image"
                />
              )}
              {message.text && <p className="message-text">{message.text}</p>}
              {message.createdAt && (
                <span className="message-timestamp">
                  {new Date(message.createdAt.toDate?.() || message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          ))
        ) : (
          <p>Chưa có tin nhắn.</p>
        )}
      </div>

      <div className="message-input">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="input-field"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="fileInput"
        />
        <button onClick={() => document.getElementById('fileInput').click()} className="attach-button">
          <span className="material-icons">attach_file</span>
        </button>
        <button onClick={() => sendMessage()} className="send-button">
          <span className="material-icons send-icon">send</span>
        </button>
      </div>
    </div>
  );
};

export default Chat;
