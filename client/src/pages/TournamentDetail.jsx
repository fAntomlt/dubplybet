import { useParams } from 'react-router-dom';
import { useEffect } from "react";
export default function TournamentDetail(){ const {id}=useParams(); useEffect(() => { document.title = "Turnyrai – DuBPlyBET"; }, []); return <h1>Turnyras #{id}</h1>; }