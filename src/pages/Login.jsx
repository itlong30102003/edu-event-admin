import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "../firebase"  // cần db để truy cập Firestore
import { doc, getDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"

function Login() {
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const uid = userCredential.user.uid
      // Lấy thông tin từ Firestore
      const userDocRef = doc(db, "organizer", uid)
      const userSnapshot = await getDoc(userDocRef)

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data()
        alert(
          `Tên: ${userData.name}\n` +
          `Email: ${userData.email}\n` 
        );
        // Gửi dữ liệu sang trang /organizer qua navigate state
        navigate("/organizer", { state: { userData } });
      } else {
        alert("Không tìm thấy thông tin người dùng trong Firestore.")
      }
    } catch (err) {
      alert("Đăng nhập thất bại: " + err.message)
    }
  }

  return (
     <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-24 space-y-4">
      <h1 style={{ color: "#fff" }}className="text-2xl font-bold text-center">Organizer Login</h1>
      <input  style={{ color: "#fff" }}name="email" type="email" className="w-full border p-2 rounded" placeholder="Email" />
      <input style={{ color: "#fff" }}name="password" type="password" className="w-full border p-2 rounded" placeholder="Password" />
      <button style={{ color: "#fff" }}type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Đăng nhập</button>
    </form> 
  )
}

export default Login
