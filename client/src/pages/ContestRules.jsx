// src/pages/ContestRules.jsx
import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

export default function ContestRules() {
  return (
    <Wrap>
      <HeaderCard aria-label="Konkurso taisyklės">
        <CardContent>
          <CardInfo>
            <CardTitle>„iCrib.pro“ — Nemokamo prognozių konkurso taisyklės</CardTitle>
            <CardDates>Galioja: 2025-08-27 – 2026-08-23 (Europa/Vilnius)</CardDates>
          </CardInfo>
        </CardContent>
      </HeaderCard>

      <BodyCard as="main">
        <Section>
          <H2>Organizatorius</H2>
          <P>
            Svetainė <strong>iCrib.pro</strong> (toliau – <strong>Organizatorius</strong>).
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Teritorija ir dalyviai</H2>
          <P>
            Dalyvauti gali <strong>18+</strong> fiziniai asmenys. Vienam asmeniui
            leidžiama turėti tik <strong>vieną</strong> paskyrą. Organizatoriaus
            darbuotojai ir jų namų ūkio nariai nedalyvauja.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Dalyvavimas nemokamas</H2>
          <P>
            <strong>Jokio pirkimo ar mokesčių nereikia.</strong> Jokių narių mokėjimų,
            pirkimų ar paslaugų įsigijimų <em>nevykdome</em>.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Laikotarpis</H2>
          <P>
            Pradžia: <strong>2025-08-27 00:00</strong> • Pabaiga:{" "}
            <strong>2026-08-23 23:59</strong> (Vilniaus laiku).
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Kaip dalyvauti</H2>
          <List>
            <li>
              Užsiregistruokite iCrib.pro, sutikite su šiomis taisyklėmis ir
              pateikite rungtynių rezultatų prognozes iki kiekvienų rungtynių
              „lock“ laiko.
            </li>
            <li>
              Pavėluotos ar po „lock“ redaguotos prognozės –{" "}
              <strong>negalioja</strong>.
            </li>
          </List>
        </Section>

        <DividerH />

        <Section>
          <H2>Žaidimo formatas ir taškų skaičiavimas</H2>
          <P>
            Taškai skiriami pagal iCrib.pro svetainėje aprašytą sistemą (pvz.,
            tikslus rezultatas – 5 tšk., teisinga baigtis – 1 tšk.). Lyderių
            lentelė rodo bendrą dalyvio taškų sumą.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Nugalėtojas ir lygiųjų atvejis</H2>
          <P>
            Pasibaigus laikotarpiui, nugalėtoju pripažįstamas dalyvis, surinkęs{" "}
            <strong>daugiausia taškų</strong>.
          </P>
          <P>
            Jei keli dalyviai surenka vienodai taškų, nugalėtojas nustatomas{" "}
            <strong>atsitiktinės atrankos „random wheel spin“ būdu</strong> tarp
            lygiųjų. Atranka fiksuojama (pvz., ekrano įrašu) skaidrumo tikslais.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Prizas</H2>
          <P>
            Vienas piniginis prizas: <strong>NUSTATOMAS KIEKVIENO TURNYRO METU (iki 40 eurų įprastai)</strong>. Prizas išmokamas
            banko pavedimu <strong>per 30 dienų</strong> nuo nugalėtojo
            patvirtinimo. Prizas neperduodamas ir nekeičiamas.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Patikra</H2>
          <P>
            Organizatorius gali paprašyti patvirtinti tapatybę, amžių ir sąskaitos
            priklausymą (pvz., dokumento kopija, banko sąskaita dalyvio vardu).
            Nepateikus per <strong>10 d.</strong> – prizas pereina kitam
            eilės dalyviui.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Mokesčiai</H2>
          <P>
            Prizas yra <strong>apmokestinamos pajamos</strong> pagal LR teisės
            aktus. Jei taikoma, Organizatorius gali <strong>išskaičiuoti</strong>{" "}
            ir/ar <strong>deklaruoti</strong> mokestį; likusius mokestinius
            įsipareigojimus vykdo laimėtojas.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Teisinis statusas</H2>
          <P>
            Tai <strong>nemokamas konkursas</strong>, <strong>ne lošimas</strong>{" "}
            ir <strong>ne loterija</strong> – nėra mokamo statymo ar bilieto
            pirkimo.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Sąžiningas žaidimas</H2>
          <P>
            Draudžiami botai, skriptai, kelių paskyrų naudojimas, susitarimai ar
            duomenų klastojimas. Pažeidimai lemia diskvalifikaciją.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Duomenų apsauga (GDPR)</H2>
          <P>
            Duomenų valdytojas – iCrib.pro. Tvarkome registracijos duomenis,
            prognozes, IP/įrenginio informaciją ir rezultatus konkurso
            vykdymui, sukčiavimo prevencijai ir teisinėms prievolėms. Daugiau –
            <LinkInline as={Link} to="/privacy"> Privatumo politikoje</LinkInline>.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Viešinimas</H2>
          <P>
            Nugalėtojo <em>vardo pirmoji raidė</em> ir taškai gali būti
            paskelbti svetainėje/socialiniuose tinkluose. Platesnis viešinimas –
            tik su atskiru sutikimu.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Atsakomybė</H2>
          <P>
            Organizatorius neatsako už gedimus, tiekėjų ar trečiųjų šalių klaidas
            ir force majeure. Maksimali atsakomybė dalyvio atžvilgiu – jam
            priklausantis prizo dydis. Tai neturi įtakos įstatymų suteiktoms
            vartotojo teisėms.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Pakeitimai</H2>
          <P>
            Jei dėl sukčiavimo, techninių nesklandumų ar force majeure konkurso
            vientisumas sutrinka, Organizatorius gali keisti, stabdyti ar
            nutraukti konkursą, kiek įmanoma nepabloginant jau dalyvavusių
            dalyvių padėties.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Governing law &amp; ginčai</H2>
          <P>
            Taikoma <strong>Lietuvos Respublikos</strong> teisė. Vartotojų
            ginčai gali būti teikiami <strong>VVTAT</strong> arba sprendžiami
            teisme pagal Organizatoriaus buveinės jurisdikciją, jei nepavyksta
            išspręsti taikiai.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>Kontaktas</H2>
          <P>
            <strong>Pagalba:</strong> <Mono>[info@icrib.pro]</Mono>{" "}
          </P>
        </Section>
      </BodyCard>
    </Wrap>
  );
}

/* ====== Styles (atitinka tavo dizainą) ====== */
const Wrap = styled.div`display:grid; gap:22px;`;
const HeaderCard = styled.div`
  position: relative; width: 100%; min-height: 180px; border-radius: 18px;
  overflow: hidden; background: #0f172a; box-shadow: 0 8px 24px rgba(2,6,23,.12);
`;
const CardContent = styled.div`
  position: absolute; inset: 0; display:flex; align-items:center; justify-content:center;
  color:#fff; text-align:center; padding: 12px;
`;
const CardInfo = styled.div`display:flex; flex-direction:column; gap:10px;`;
const CardTitle = styled.div`
  font-size: clamp(24px, 2.4vw, 36px); font-weight: 900; letter-spacing: -0.01em;
  text-shadow: 0 2px 6px rgba(0,0,0,0.35);
`;
const CardDates = styled.div`
  font-weight: 700; opacity:.95; font-size: clamp(14px, 2.2vw, 18px);
`;
const BodyCard = styled.section`
  border: 1px solid #e7eaf0; border-radius: 14px; background: #fff;
  box-shadow: 0 8px 24px rgba(2,6,23,.06);
  padding: 16px; display:grid; gap:16px;
`;
const Section = styled.section`display:grid; gap:8px;`;
const H2 = styled.h2`
  margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: .01em;
`;
const P = styled.p`
  margin: 0; color:#0f172a; line-height:1.65; font-weight:600;
`;
const List = styled.ul`
  margin: 0; padding-left: 18px; display:grid; gap:6px; color:#0f172a; font-weight:600; line-height:1.6;
`;
const DividerH = styled.div`height:1px; background:#eceff3;`;
const NavRow = styled.div`
  display:flex; gap:10px; justify-content:space-between; border-top:1px dashed #e5e7eb; padding-top:10px;
`;
const LinkBtn = styled.button`
  border:1px solid #e5e7eb; background:#fff; border-radius:10px; padding:8px 12px; cursor:pointer;
  font-weight:800; color:#0f172a;
  &:hover{ background:#f9fafb; }
`;
const LinkInline = styled.span`
  font-weight: 800; text-decoration: underline; cursor: pointer;
`;
const Mono = styled.code`font-family: ui-monospace, SFMono-Regular, Menlo, monospace;`;
const Muted = styled.span`color:#64748b; font-weight:600;`;
