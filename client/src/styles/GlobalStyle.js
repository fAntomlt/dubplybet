import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap');

  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; background: ${({theme}) => theme.colors.bg}; }
  body {
    margin: 0;
    font-family: "Nunito", sans-serif;
    font-weight: 500;
    color: ${({theme}) => theme.colors.text};
  }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; }
`;