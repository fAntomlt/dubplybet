// src/pages/PrivacyPolicy.jsx
import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

/**
 * Privatumo politika – iCrib.pro
 * Pakeiskite vietas skliausteliuose (pvz., kontaktinį el. paštą).
 */

export default function PrivacyPolicy() {
  return (
    <Wrap>
      <HeaderCard aria-label="Privatumo politika">
        <CardContent>
          <CardInfo>
            <CardTitle>Privatumo politika</CardTitle>
            <CardDates>Įsigaliojimo data: 2025-08-27</CardDates>
          </CardInfo>
        </CardContent>
      </HeaderCard>

      <BodyCard as="main">
        <Section>
          <H2>1. Valdytojas ir kontaktai</H2>
          <P>
            <strong>Valdytojas:</strong> iCrib.pro
            <br />
            <strong>Kontaktai duomenų apsaugos klausimais:</strong>{" "}
            <Mono>[info@icrib.pro]</Mono>{" "}
            <br />
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>2. Kokius duomenis renkame</H2>
          <List>
            <li>
              <strong>Paskyros duomenys:</strong> el. paštas, vartotojo
              vardas/slapyvardis, vartotojo "Discord" platformos vardas/slapyvardis, amžiaus (18+) patvirtinimas.
            </li>
            <li>
              <strong>Dalyvavimo duomenys:</strong> prognozės, surinkti taškai,
              lyderių lentelės pozicija, „lock“ laiko žymos.
            </li>
            <li>
              <strong>Techniniai duomenys:</strong> IP adresas, įrenginio ir
              naudojimo informacija, žurnalai (log’ai), saugos įvykių įrašai.
            </li>
            <li>
              <strong>Laimėtojo patikros/išmokėjimo duomenys (jei laimite):</strong>{" "}
              vardas, pavardė, banko sąskaitos rekvizitai, amžiaus/tapatybės
              patvirtinimo dokumentai (jei būtina), mokesčių apskaitai reikalinga
              informacija.
            </li>
          </List>
        </Section>

        <DividerH />

        <Section>
          <H2>3. Tikslai ir teisiniai pagrindai</H2>
          <List>
            <li>
              <strong>Konkurso vykdymas</strong> (paskyros kūrimas, prognozių
              priėmimas, taškų skaičiavimas, prizų skyrimas) –{" "}
              <strong>BDAR 6(1)(b)</strong>.
            </li>
            <li>
              <strong>Sukčiavimo prevencija ir sistemos sauga</strong> –{" "}
              <strong>BDAR 6(1)(f)</strong> (teisėtas interesas).
            </li>
            <li>
              <strong>Teisinės prievolės</strong> (mokesčiai/apskaita, vartotojų
              teisės) – <strong>BDAR 6(1)(c)</strong>.
            </li>
            <li>
              <strong>Viešinimas</strong> (nugalėtojo vardo pirmoji raidė,
              taškai) – teisėtas interesas skaidrumui;{" "}
              <em>platesnis viešinimas</em> (pvz., pilnas vardas, nuotrauka) –
              tik su <strong>sutikimu</strong> (<strong>BDAR 6(1)(a)</strong>).
            </li>
          </List>
        </Section>

        <DividerH />

        <Section>
          <H2>4. Saugojimo laikotarpiai</H2>
          <List>
            <li>
              Dalyvavimo duomenys: <strong>12 mėn.</strong> po prizo
              išmokėjimo (ar konkurso pabaigos – jei neprizinis dalyvis), vėliau
              ištrinami/anonimizuojami.
            </li>
            <li>
              Žurnalai ir saugos įrašai: iki <strong>90 dienų</strong>, nebent
              reikalingi incidento tyrimui.
            </li>
            <li>
              Apskaitos/mokesčių dokumentai (jei taikoma): pagal teisės aktus
              (iki <strong>10 metų</strong>).
            </li>
          </List>
        </Section>

        <DividerH />

        <Section>
          <H2>5. Gavėjai ir perdavimas</H2>
          <P>
            <strong>Paslaugų teikėjai:</strong> hostingo, IT priežiūros, el.
            pašto, analitikos (tik tiek, kiek būtina paslaugai teikti).
            <br />
            <strong>Mokėjimų/apskaitos partneriai:</strong> tik prizui
            išmokėti ir teisinėms pareigoms vykdyti.
            <br />
            <strong>Valstybės institucijos:</strong> kai to reikalauja teisės
            aktai.
          </P>
          <P>
            Duomenys paprastai tvarkomi <strong>ES/EEE</strong>. Jei prireiktų
            perduoti už ES/EEE ribų, taikysime{" "}
            <em>ES standartines sutarčių sąlygas</em> ir kitas BDAR reikalaujamas
            apsaugos priemones.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>6. Slapukai ir analizė</H2>
          <P>
            Naudojame <strong>būtinus slapukus</strong> svetainei ir konkursui
            veikti (sesijos, saugos, „lock“ laikų fiksavimui).{" "}
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>7. Automatizuotas sprendimų priėmimas</H2>
          <P>
            Netaikome automatizuoto sprendimų priėmimo ar profiliavimo, kuris
            sukeltų jums teisines ar panašiai reikšmingas pasekmes. Lyderių
            lentelė skaičiuojama pagal iš anksto paskelbtas taisykles.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>8. Jūsų teisės</H2>
          <P>
            Turite teises: <strong>prieigos</strong>, <strong>taisymo</strong>,{" "}
            <strong>ištrynimo</strong>, <strong>tvarkymo apribojimo</strong>,{" "}
            <strong>duomenų perkeliamumo</strong>,{" "}
            <strong>prieštaravimo</strong> (kai tvarkome pagal teisėtą
            interesą), ir teisę <strong>atšaukti sutikimą</strong> (kai
            tvarkymas grindžiamas sutikimu).
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>9. Saugumas</H2>
          <P>
            Taikome organizacines ir technines priemones (šifravimas
            perduodant, prieigų kontrolė, žurnalai, atsarginės kopijos) siekiant
            apsaugoti duomenis. Visgi visiškos apsaugos garantuoti negalime.
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>10. Amžiaus apribojimas</H2>
          <P>
            Dalyvauti gali tik <strong>18 metų ir vyresni</strong>. Amžių
            galime tikrinti paprašydami patvirtinančių dokumentų (pvz., prizų
            išmokėjimo metu).
          </P>
        </Section>

        <DividerH />

        <Section>
          <H2>11. Politikos pakeitimai</H2>
          <P>
            Politiką galime atnaujinti pasikeitus paslaugoms ar teisiniams
            reikalavimams. <strong>Esminius pakeitimus</strong> paskelbsime
            svetainėje prieš jiems įsigaliojant.
          </P>
        </Section>
      </BodyCard>
    </Wrap>
  );
}

/* ====== Styles (derintos prie tavo dizaino) ====== */
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
  font-size: clamp(28px, 2.6vw, 40px); font-weight: 900; letter-spacing: -0.01em;
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
const Mono = styled.code`font-family: ui-monospace, SFMono-Regular, Menlo, monospace;`;