import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import { Invitee } from '@/lib/types';

interface WhatsAppShareSectionProps {
  invitee: Invitee | null;
}

export const WhatsAppShareSection: React.FC<WhatsAppShareSectionProps> = ({ invitee }) => {
  const guestName = invitee?.name || 'Honored Guest';
  const guestSlug = invitee?.slug || 'guest';

  const handleShare = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/invite/${guestSlug}`;

    const message = weddingConfig.whatsapp.messageTemplate
      .replace(/GUEST_NAME/g, guestName)
      .replace(/GUEST_LINK/g, inviteUrl);

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-6 sm:px-10">
        <span className="font-label text-xs uppercase tracking-[0.3em] text-[#9a7080] block mb-2">
          Share Invitation
        </span>
        <h4 className="font-display text-lg sm:text-xl font-bold text-[#2d1a22] mb-2">
          Pass Along the Joy
        </h4>
        <p className="font-body text-xs text-[#9a7080] mb-6 max-w-sm mx-auto">
          Share this personal wedding invitation link directly with family and friends via WhatsApp.
        </p>

        {/* WhatsApp Button */}
        <button
          onClick={handleShare}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-label text-xs sm:text-sm uppercase tracking-widest font-semibold shadow-lg hover:shadow-xl active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          {/* WhatsApp SVG Icon */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          <span>Share on WhatsApp</span>
        </button>
      </Card3D>
    </motion.section>
  );
};
