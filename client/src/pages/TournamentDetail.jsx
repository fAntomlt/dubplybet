import { useParams } from 'react-router-dom';
export default function TournamentDetail(){ const {id}=useParams(); return <h1>Turnyras #{id}</h1>; }