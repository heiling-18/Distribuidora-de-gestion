import React from 'react';
import s from './HenMascot.module.css';

/** Gallina criolla picoteando concentrado junto a un bulto Italcol (pantalla de inicio de sesión) */
export function HenMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 420" className={className} role="img" aria-label="Gallina café picoteando granos de concentrado junto a un bulto Italcol">
      <defs>
        <linearGradient id="hen-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9712E" /><stop offset=".55" stopColor="#A9541F" /><stop offset="1" stopColor="#7C3814" /></linearGradient>
        <radialGradient id="hen-body-hi" cx=".55" cy=".3" r=".55"><stop offset="0" stopColor="#E9A35E" stopOpacity=".75" /><stop offset="1" stopColor="#E9A35E" stopOpacity="0" /></radialGradient>
        <linearGradient id="hen-tail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2E3A2A" /><stop offset=".5" stopColor="#1E1A16" /><stop offset="1" stopColor="#3A2A1C" /></linearGradient>
        <linearGradient id="hen-hackle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E7A04F" /><stop offset="1" stopColor="#B86226" /></linearGradient>
        <linearGradient id="hen-head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D8863F" /><stop offset="1" stopColor="#A9541F" /></linearGradient>
        <linearGradient id="hen-comb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EE4B30" /><stop offset="1" stopColor="#A51C12" /></linearGradient>
        <linearGradient id="hen-beak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F3CB5A" /><stop offset="1" stopColor="#C38A1C" /></linearGradient>
        <linearGradient id="hen-leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#C98D1E" /><stop offset=".5" stopColor="#EDBB45" /><stop offset="1" stopColor="#C98D1E" /></linearGradient>
        <linearGradient id="hen-sack" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#D9D0BE" /><stop offset=".4" stopColor="#F3EEE3" /><stop offset="1" stopColor="#CFC5B1" /></linearGradient>
        <pattern id="hen-weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3h6M3 0v6" stroke="#B9AE98" strokeWidth=".6" opacity=".5" /></pattern>
        <pattern id="hen-feather" width="16" height="11" patternUnits="userSpaceOnUse">
          <path d="M0 9 C4 3 12 3 16 9" stroke="#6E3011" strokeWidth="1.1" fill="none" opacity=".45" />
          <path d="M-8 3.5 C-4 -2.5 4 -2.5 8 3.5 M8 3.5 C12 -2.5 20 -2.5 24 3.5" stroke="#6E3011" strokeWidth="1.1" fill="none" opacity=".35" />
        </pattern>
      </defs>

      <ellipse cx="275" cy="386" rx="215" ry="17" fill="#241E19" />

      <g className={s.bulto}>
        <path d="M404 262 C398 250 408 236 420 240 C428 228 446 226 456 236 C466 226 486 230 486 244 C496 246 500 256 494 264 Z" fill="#CFC5B1" />
        <path d="M398 262 C396 300 396 344 402 380 C432 386 470 386 498 380 C504 344 504 300 500 262 C468 256 430 256 398 262 Z" fill="url(#hen-sack)" />
        <path d="M398 262 C396 300 396 344 402 380 C432 386 470 386 498 380 C504 344 504 300 500 262 C468 256 430 256 398 262 Z" fill="url(#hen-weave)" />
        <path d="M412 280 C414 310 412 340 416 372 M484 280 C482 312 486 342 482 372" stroke="#B9AE98" strokeWidth="1.5" fill="none" opacity=".7" />
        <path d="M398 294 C432 290 468 290 500 294 L501 334 C468 330 432 330 398 334 Z" fill="#C8281C" />
        <text x="449" y="322" textAnchor="middle" fill="#FFFFFF" fontFamily="var(--font-bricolage), sans-serif" fontWeight="800" fontSize="27" letterSpacing="-0.5">Italcol</text>
      </g>

      <ellipse className={s.grano} cx="384" cy="376" rx="4.5" ry="3" fill="#E9B44A" />
      <ellipse className={`${s.grano} ${s.g2}`} cx="398" cy="380" rx="3.5" ry="2.6" fill="#C98E2A" />
      <ellipse className={`${s.grano} ${s.g3}`} cx="370" cy="381" rx="4" ry="2.8" fill="#E9B44A" />
      <ellipse className={`${s.grano} ${s.g4}`} cx="392" cy="372" rx="3" ry="2.2" fill="#B5782A" />
      <ellipse className={`${s.grano} ${s.g5}`} cx="360" cy="378" rx="3.6" ry="2.6" fill="#E9B44A" />

      <g className={s.gallina}>
        {/* Cola */}
        <path d="M186 226 C140 186 124 130 146 92 C152 132 170 166 204 196 Z" fill="url(#hen-tail)" />
        <path d="M190 232 C134 214 106 166 112 124 C130 164 160 192 206 206 Z" fill="url(#hen-tail)" />
        <path d="M194 240 C146 238 112 210 100 176 C128 200 162 214 206 218 Z" fill="#2A2018" />
        <path d="M150 104 C156 138 172 168 200 194 M120 136 C136 168 162 190 200 204" stroke="#4F6A47" strokeWidth="2" fill="none" opacity=".6" />
        <path d="M182 216 C166 192 164 164 176 150 C186 174 198 190 218 200 Z" fill="#9C4B1C" />
        {/* Cuerpo */}
        <path d="M180 228 C176 180 212 150 262 148 C304 146 336 162 350 198 C362 234 350 284 316 308 C286 330 242 334 210 318 C186 304 182 264 180 228 Z" fill="url(#hen-body)" />
        <path d="M180 228 C176 180 212 150 262 148 C304 146 336 162 350 198 C362 234 350 284 316 308 C286 330 242 334 210 318 C186 304 182 264 180 228 Z" fill="url(#hen-feather)" />
        <path d="M180 228 C176 180 212 150 262 148 C304 146 336 162 350 198 C362 234 350 284 316 308 C286 330 242 334 210 318 C186 304 182 264 180 228 Z" fill="url(#hen-body-hi)" />
        <path d="M304 176 C334 184 354 214 350 248 C346 282 322 306 294 314 C310 282 312 232 304 176 Z" fill="#B95E25" opacity=".85" />
        {/* Ala */}
        <path d="M216 222 C238 194 292 190 320 220 C314 254 278 278 238 270 C218 266 208 242 216 222 Z" fill="#8E4219" />
        <path d="M222 222 C244 202 286 200 310 222 C298 230 276 234 252 234 C238 234 228 230 222 222 Z" fill="#B0602A" />
        <path d="M228 238 C250 232 280 232 306 238 M230 250 C252 246 278 246 300 252 M234 262 C254 260 274 260 292 264" stroke="#5E2A10" strokeWidth="1.6" fill="none" opacity=".7" />
        <path d="M232 266 C256 276 288 272 310 254 L302 272 C278 288 248 288 226 278 Z" fill="#5A2810" />
        <path d="M244 280 C264 286 284 282 300 272" stroke="#3E1C0B" strokeWidth="1.4" fill="none" opacity=".6" />
        {/* Patas */}
        <path d="M226 306 C222 326 240 338 256 328 C262 320 254 306 242 302 Z M270 304 C268 326 286 336 298 324 C302 314 294 302 282 300 Z" fill="#9C4B1C" />
        <path d="M244 326 L240 368 M284 324 L288 368" stroke="url(#hen-leg)" strokeWidth="8" strokeLinecap="round" />
        <path d="M244 330 L240 366 M284 328 L288 366" stroke="#A8711A" strokeWidth="8" strokeDasharray="1.5 4.5" opacity=".55" />
        <path d="M240 368 L216 377 M240 368 L242 382 M240 368 L262 378 M240 368 L232 360" stroke="#DDA537" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M288 368 L268 378 M288 368 L292 383 M288 368 L312 378 M288 368 L280 360" stroke="#DDA537" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M214 378 l-4 1 M243 383 l1 3 M264 379 l4 0 M266 379 l-4 1 M293 384 l1 3 M314 379 l4 0" stroke="#5B4A30" strokeWidth="2.4" strokeLinecap="round" />
        {/* Cuello y cabeza (picotea) */}
        <g className={s.cabeza}>
          <path d="M296 204 C294 176 304 150 324 138 L360 150 C366 176 356 202 334 218 C320 226 302 222 296 204 Z" fill="url(#hen-hackle)" />
          <path d="M306 202 C308 184 314 166 326 154 M318 210 C320 190 328 172 340 160 M330 212 C334 194 342 178 352 166 M300 190 C302 176 308 162 318 152" stroke="#9A4A1A" strokeWidth="1.3" fill="none" opacity=".75" />
          <path d="M322 152 C320 124 342 108 364 114 C384 120 390 142 384 158 C376 174 352 178 336 172 C326 168 322 162 322 152 Z" fill="url(#hen-head)" />
          <path d="M326 124 C322 110 328 100 334 106 C334 94 344 88 348 100 C352 88 362 88 364 100 C370 92 380 96 376 110 C380 114 378 120 372 122 C358 116 340 118 326 124 Z" fill="url(#hen-comb)" />
          <path d="M334 108 C338 112 344 114 350 112 M352 104 C356 108 362 110 368 108" stroke="#8C1A10" strokeWidth="1" fill="none" opacity=".6" />
          <ellipse cx="362" cy="138" rx="13" ry="11" fill="#D9542F" opacity=".9" />
          <ellipse cx="350" cy="155" rx="5" ry="4" fill="#E0552F" />
          <path d="M382 140 C392 140 402 146 406 153 C398 153 390 153 382 151 Z" fill="url(#hen-beak)" />
          <path d="M382 151 C390 153 398 154 404 154 C398 159 388 160 382 156 Z" fill="#B57F18" />
          <ellipse cx="388" cy="144" rx="1.8" ry="1.1" fill="#7A4E10" />
          <path d="M372 158 C384 162 386 182 374 190 C364 188 362 168 366 160 Z" fill="url(#hen-comb)" />
          <path d="M364 162 C370 168 370 182 362 186 C356 180 356 168 360 162 Z" fill="#B3241A" />
          <circle cx="364" cy="136" r="5.8" fill="#E39030" />
          <circle cx="364.6" cy="136" r="2.9" fill="#120C08" />
          <circle cx="366" cy="134.4" r="1.2" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}
