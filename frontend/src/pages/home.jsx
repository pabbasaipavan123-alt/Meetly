import React, { useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css"
import { IconButton,Button } from '@mui/material'
import TextField from '@mui/material/TextField'
const HomeComponent = () => {
    let navigate=useNavigate();
    const [meetingCode,setMeetingCode]=useState("")
    let handleJoinVideoCall=async ()=>{
        navigate(`/${meetingCode}`)
    }


  return (
   <>

        <div className="navBar">
            <div style={{display:"flex",alignItems:"center"}}>
                <h2>Meetly Video Call</h2>
            </div>
            <div style={{display:"flex", alignItems:"center"}}>
                
                <Button onClick={()=>{
                        localStorage.removeItem("token");
                        navigate("/auth")
                    }}>
                    Logout
                    </Button>
            </div>
        </div>
        <div className="meetContainer">
            <div className="leftPanel">
                <div>
                    <h2>Providing Quality Video Call</h2>
                    <div style={{display:"flex",gap:"10px"}}>
                        <TextField onChange={(e)=>{setMeetingCode(e.target.value)}} id="outlined-basic" label="Meeting Code" variant="outlined"/>
                        <Button onClick={handleJoinVideoCall} variant='contained' >Join</Button>

                    </div>
                </div>
            </div>
             <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="" />
                </div>
        </div>
   
   </>
  )
}

export default withAuth(HomeComponent)
