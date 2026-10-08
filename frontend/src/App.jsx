import React from 'react'
import {Route , BrowserRouter as Router ,Routes} from 'react-router-dom';
import LandingPage from './pages/landingPage';
import Authentication from './pages/authentication.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import VideoMeetComponent from './pages/videoMeet.jsx';
import HomeComponent from './pages/home.jsx';
const App = () => {
  return (
     <>
      <Router>
        <AuthProvider>
        <Routes>
          {/* <Route psth='/home'> </Route> */}
          <Route path='/' element={<LandingPage />}></Route>
          <Route path='/auth' element={<Authentication/>}></Route>
          <Route path='/home' element={<HomeComponent/>} />
          <Route path="/:url" element={<VideoMeetComponent/>}></Route>
        </Routes>
        </AuthProvider>
      </Router>
    </>
  )
}

export default App
