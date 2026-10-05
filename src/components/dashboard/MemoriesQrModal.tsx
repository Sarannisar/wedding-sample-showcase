import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Download, Printer, Camera, Smartphone, Heart, Sparkles, UploadCloud } from 'lucide-react';
import { WeddingEvent } from '@/lib/memoriesTypes';
import { weddingConfig } from '@/config/weddingConfig';
import { notify } from '@/lib/notify';

interface MemoriesQrModalProps {
  event: WeddingEvent;
  onClose: () => void;
}

export const MemoriesQrModal: React.FC<MemoriesQrModalProps> = ({ event, onClose }) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://whisper-rsvp.lovable.app';
  const memoriesUrl = `${origin}/memories/${event.slug}`;
  const qrRef = useRef<SVGSVGElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(memoriesUrl);
    notify.success('Memories link copied to clipboard!');
  };

  const handleDownloadPng = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 1400;
    canvas.height = 1400;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 100, 100, 1200, 1200);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${event.slug}-memories-qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        notify.success('High-resolution QR code downloaded!');
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#4a3038]/75 backdrop-blur-sm overflow-y-auto animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 0mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 148mm !important;
            height: 210mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-a5-card {
            width: 148mm !important;
            height: 210mm !important;
            max-width: 148mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 12mm 10mm !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="w-full max-w-xl bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#e08aa3]/30 relative my-auto print:p-0 print:max-w-none print:shadow-none print:border-none print:bg-transparent">
        {/* Header Bar (Hidden on Print) */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e08aa3]/20 no-print">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#fff2f6] text-[#b05570]">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-display font-bold text-sm text-[#4a3038]">
                Table Signage Card (A5 Size)
              </h3>
              <p className="text-[11px] text-[#7a4d5d]">
                Formatted for A5 portrait frames and table stands
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* BEAUTIFUL A5 WEDDING SIGNAGE CARD                        */}
        {/* Aspect Ratio 1 : 1.414 (Standard A5: 148mm x 210mm)      */}
        {/* ======================================================== */}
        <div className="print-a5-card w-full aspect-[1/1.414] bg-gradient-to-b from-[#fffafc] via-[#ffffff] to-[#fff5f8] rounded-2xl border-2 border-[#e08aa3]/40 shadow-card-3d p-6 sm:p-8 flex flex-col justify-between text-center relative overflow-hidden select-none">
          {/* Dual Luxury Frame Borders */}
          <div className="absolute inset-2 sm:inset-3 border border-[#e08aa3]/30 rounded-xl pointer-events-none" />
          <div className="absolute inset-3.5 sm:inset-4.5 border border-[#f7c1d0]/50 rounded-lg pointer-events-none" />

          {/* Elegant Corner Filigree Accents */}
          <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-[#b05570]/40 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-[#b05570]/40 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-[#b05570]/40 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-[#b05570]/40 rounded-br-lg pointer-events-none" />

          {/* ======================================================== */}
          {/* TOP SECTION: Bismillah, Couple Names & Tagline           */}
          {/* ======================================================== */}
          <div className="relative z-10 pt-1">
            <p className="font-arabic text-base sm:text-lg text-[#b05570] tracking-wide mb-1 leading-none">
              بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
            </p>

            <div className="inline-flex items-center justify-center gap-2 mt-1 mb-0.5">
              <span className="h-[1px] w-8 bg-[#e08aa3]/40" />
              <div className="w-8 h-8 rounded-full border border-[#e08aa3]/50 bg-[#fff2f6] shadow-sm flex items-center justify-center text-[#b05570] font-script text-sm font-bold">
                {weddingConfig.couple.monogram || 'S & S'}
              </div>
              <span className="h-[1px] w-8 bg-[#e08aa3]/40" />
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4a3038] mt-0.5 leading-tight">
              Safiyya &amp; Sharrafuth
            </h1>

            <p className="font-script text-lg sm:text-xl text-[#b05570] mt-0.5">
              Share Your Photos &amp; Videos With Us
            </p>

            <p className="font-body text-xs sm:text-sm text-[#7a4d5d] max-w-sm mx-auto leading-snug mt-1.5">
              Help us capture every candid smile and special moment through your eyes!
            </p>
          </div>

          {/* ======================================================== */}
          {/* MIDDLE SECTION: Large, Highly Visible QR Hero            */}
          {/* ======================================================== */}
          <div className="relative z-10 my-auto py-2 flex flex-col items-center justify-center">
            {/* Prominent High-Contrast QR Frame */}
            <div className="p-4 sm:p-5 bg-white rounded-3xl shadow-card-hover border-3 border-[#e08aa3]/50 inline-block relative group">
              {/* Outer decorative ring */}
              <div className="absolute -inset-1.5 rounded-[28px] border border-[#f7c1d0]/60 pointer-events-none" />

              <QRCodeSVG
                ref={qrRef}
                value={memoriesUrl}
                size={230}
                level="H"
                includeMargin={false}
                fgColor="#3d222b"
              />

              {/* Central Badge */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#e08aa3] to-[#b05570] text-white text-[11px] font-label uppercase tracking-widest font-extrabold shadow-md whitespace-nowrap flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>Scan With Camera</span>
              </div>
            </div>

            {/* 3 Step Instruction Pills */}
            <div className="grid grid-cols-3 gap-2 mt-6 w-full max-w-sm mx-auto text-[#7a4d5d]">
              <div className="py-2 px-1 rounded-xl bg-white/90 border border-[#e08aa3]/30 shadow-xs flex flex-col items-center text-center">
                <Camera className="w-4 h-4 text-[#b05570] mb-1" />
                <span className="text-[10px] font-label uppercase font-bold text-[#4a3038] tracking-wider">1. Open Camera</span>
                <span className="text-[9px] text-[#7a4d5d] leading-none mt-0.5">Point at code</span>
              </div>
              <div className="py-2 px-1 rounded-xl bg-white/90 border border-[#e08aa3]/30 shadow-xs flex flex-col items-center text-center">
                <Smartphone className="w-4 h-4 text-[#b05570] mb-1" />
                <span className="text-[10px] font-label uppercase font-bold text-[#4a3038] tracking-wider">2. Tap Link</span>
                <span className="text-[9px] text-[#7a4d5d] leading-none mt-0.5">No app needed</span>
              </div>
              <div className="py-2 px-1 rounded-xl bg-white/90 border border-[#e08aa3]/30 shadow-xs flex flex-col items-center text-center">
                <UploadCloud className="w-4 h-4 text-[#b05570] mb-1" />
                <span className="text-[10px] font-label uppercase font-bold text-[#4a3038] tracking-wider">3. Drop Photos</span>
                <span className="text-[9px] text-[#7a4d5d] leading-none mt-0.5">Instant upload</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BOTTOM SECTION: Footer Details & Clean Link              */}
          {/* ======================================================== */}
          <div className="relative z-10 pt-1 pb-1">
            <div className="flex items-center justify-center gap-2 text-xs font-label uppercase tracking-widest text-[#b05570] font-bold">
              <Heart className="w-3.5 h-3.5 fill-[#e08aa3] text-[#e08aa3]" />
              <span>No App, Login, or Account Required</span>
              <Heart className="w-3.5 h-3.5 fill-[#e08aa3] text-[#e08aa3]" />
            </div>

            <p className="text-[10px] text-[#b592a0] font-mono mt-1 truncate max-w-xs mx-auto">
              {memoriesUrl}
            </p>

            <p className="text-[10px] text-[#7a4d5d] mt-1 font-body italic">
              Thank you for celebrating our wedding with us! ❤️
            </p>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS (Hidden on Print) */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 no-print">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#e08aa3]/30 bg-white hover:bg-[#fff2f6] text-[#4a3038] text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Copy className="w-3.5 h-3.5 text-[#e08aa3]" />
            <span>Copy Link</span>
          </button>

          <button
            onClick={handleDownloadPng}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#e08aa3]/30 bg-white hover:bg-[#fff2f6] text-[#4a3038] text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#e08aa3]" />
            <span>Save PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#e08aa3] to-[#b05570] hover:from-[#d17e92] hover:to-[#9c4b63] text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A5 Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
