import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase'; // Adjust path as needed
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import './Chat.css'; // Import CSS

const AllChats = () => {
  const navigate = useNavigate();
  const currentUserId = auth.currentUser?.uid;
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!currentUserId) {
      console.warn('No currentUserId found, skipping Firestore query');
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUserId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = [];
      const userIds = new Set(); // Lưu trữ các userId duy nhất (người dùng, không phải organizer)

      // Lọc và thu thập userIds
      for (const doc of snapshot.docs) {
        const chat = doc.data();
        const participants = chat.participants;

        // Kiểm tra participants: phải là mảng, có đúng 2 phần tử
        if (!Array.isArray(participants) || participants.length !== 2) {
          console.warn(`Invalid participants in chat ${doc.id}:`, participants);
          continue;
        }

        // Tìm userId (người không phải currentUserId)
        const userId = participants.find(id => id !== currentUserId);

        // Kiểm tra userId hợp lệ
        if (!userId) {
          console.warn(`No userId found in chat ${doc.id}`);
          continue;
        }

        userIds.add(userId);
        chatsData.push({
          id: doc.id,
          lastMessage: chat.lastMessage || '',
          unreadCount: chat.unreadCount?.[currentUserId] || 0,
          createdAt: chat.createdAt
            ? new Date(chat.createdAt.toDate()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
          user: { id: userId }, // Sẽ cập nhật name/avatar sau
        });
      }

      // Lấy thông tin users theo batch
      const usersData = {};
      if (userIds.size > 0) {
        const userDocs = await getDocs(
          query(
            collection(db, 'USER'),
            where('__name__', 'in', Array.from(userIds))
          )
        );
        userDocs.forEach(doc => {
          usersData[doc.id] = doc.data();
        });
      }

      // Cập nhật chatsData với thông tin user
      chatsData.forEach(chat => {
        const userData = usersData[chat.user.id] || {};
        chat.user.name = userData.name || 'Unknown';
        chat.user.avatar = userData.photoURL
        || null;
      });

      setChats(chatsData);
    }, (error) => {
      console.error('Error in chats snapshot:', error);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const renderChatItem = (chat) => {
    // Kiểm tra trước khi điều hướng
    if (!chat.user.id || !currentUserId) {
      console.warn('Missing userId or currentUserId for chat:', chat.id);
      return null;
    }

    return (
      <div
        className="chat-item"
        onClick={() =>
            navigate(`/dashboard/chat/${chat.user.id}`, {
              state: { currentUserId, userId: chat.user.id },
            })
          }
      >
        <img
          src={chat.user.avatar || 'https://via.placeholder.com/48'}
          alt="Avatar"
          className="chat-avatar"
        />
        <div className="chat-text-container">
          <span className="chat-name">{chat.user.name}</span>
          <span className="chat-message">{chat.lastMessage}</span>
        </div>
        <div className="chat-right-container">
          {chat.unreadCount > 0 && (
            <div className="chat-unread-badge">
              <span className="chat-unread-text">
                {chat.unreadCount.toString().padStart(2, '0')}
              </span>
            </div>
          )}
          <span className="chat-time-text">{chat.createdAt}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="all-chats-container">
      <div className="chats-list">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <React.Fragment key={chat.id}>
              {renderChatItem(chat)}
              <div className="chat-separator" />
            </React.Fragment>
          ))
        ) : (
          <p>No chats yet.</p>
        )}
      </div>
    </div>
  );
};

export default AllChats;