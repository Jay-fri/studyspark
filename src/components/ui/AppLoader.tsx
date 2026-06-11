import styled, { keyframes } from "styled-components";

const rotation = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const roundness = keyframes`
  0%   { filter: contrast(15); }
  20%  { filter: contrast(3); }
  40%  { filter: contrast(3); }
  60%  { filter: contrast(15); }
  100% { filter: contrast(15); }
`;

const colorize = keyframes`
  0%   { filter: hue-rotate(0deg); }
  20%  { filter: hue-rotate(-30deg); }
  40%  { filter: hue-rotate(-60deg); }
  60%  { filter: hue-rotate(-90deg); }
  80%  { filter: hue-rotate(-45deg); }
  100% { filter: hue-rotate(0deg); }
`;

const StyledWrapper = styled.div<{ $size?: number }>`
  .loader {
    --color-one: #38E0C3;
    --color-two: #1a8a7a;
    --color-three: rgba(56,224,195,0.5);
    --color-four: rgba(26,138,122,0.5);
    --color-five: rgba(56,224,195,0.25);
    --time-animation: 2s;
    --size: ${(p) => p.$size ?? 1};
    position: relative;
    border-radius: 50%;
    transform: scale(var(--size));
    box-shadow:
      0 0 25px 0 var(--color-three),
      0 20px 50px 0 var(--color-four);
    animation: ${colorize} calc(var(--time-animation) * 3) ease-in-out infinite;
  }

  .loader::before {
    content: "";
    position: absolute;
    top: 0; left: 0;
    width: 100px; height: 100px;
    border-radius: 50%;
    border-top: solid 1px var(--color-one);
    border-bottom: solid 1px var(--color-two);
    background: linear-gradient(180deg, var(--color-five), var(--color-four));
    box-shadow:
      inset 0 10px 10px 0 var(--color-three),
      inset 0 -10px 10px 0 var(--color-four);
  }

  .loader .box {
    width: 100px; height: 100px;
    background: linear-gradient(180deg, var(--color-one) 30%, var(--color-two) 70%);
    mask: url(#app-loader-clip);
    -webkit-mask: url(#app-loader-clip);
  }

  .loader svg { position: absolute; }

  .loader svg #app-loader-clip {
    filter: contrast(15);
    animation: ${roundness} calc(var(--time-animation) / 2) linear infinite;
  }

  .loader svg #app-loader-clip polygon { filter: blur(7px); }

  .loader svg #app-loader-clip polygon:nth-child(1) {
    transform-origin: 75% 25%;
    transform: rotate(90deg);
  }
  .loader svg #app-loader-clip polygon:nth-child(2) {
    transform-origin: 50% 50%;
    animation: ${rotation} var(--time-animation) linear infinite reverse;
  }
  .loader svg #app-loader-clip polygon:nth-child(3) {
    transform-origin: 50% 60%;
    animation: ${rotation} var(--time-animation) linear infinite;
    animation-delay: calc(var(--time-animation) / -3);
  }
  .loader svg #app-loader-clip polygon:nth-child(4) {
    transform-origin: 40% 40%;
    animation: ${rotation} var(--time-animation) linear infinite reverse;
  }
  .loader svg #app-loader-clip polygon:nth-child(5) {
    transform-origin: 40% 40%;
    animation: ${rotation} var(--time-animation) linear infinite reverse;
    animation-delay: calc(var(--time-animation) / -2);
  }
  .loader svg #app-loader-clip polygon:nth-child(6) {
    transform-origin: 60% 40%;
    animation: ${rotation} var(--time-animation) linear infinite;
  }
  .loader svg #app-loader-clip polygon:nth-child(7) {
    transform-origin: 60% 40%;
    animation: ${rotation} var(--time-animation) linear infinite;
    animation-delay: calc(var(--time-animation) / -1.5);
  }
`;

export function AppLoader({ size = 1 }: { size?: number }) {
  return (
    <StyledWrapper $size={size}>
      <div className="loader">
        <svg width={100} height={100} viewBox="0 0 100 100">
          <defs>
            <mask id="app-loader-clip">
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
            </mask>
          </defs>
        </svg>
        <div className="box" />
      </div>
    </StyledWrapper>
  );
}

export function AppLoaderPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a1628" }}>
      <AppLoader />
    </div>
  );
}
