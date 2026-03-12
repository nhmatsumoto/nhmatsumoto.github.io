import React from 'react';
import { motion } from 'framer-motion';

const timelineEvents = [
  {
    date: "Current",
    title: "Software Engineer",
    company: "Personal Projects & R&D",
    description: "Focusing on AI agent orchestration (Ronaldinho Agent) and distributed systems architecture."
  },
  {
    date: "2023 - 2024",
    title: "Senior Developer",
    company: "FinTech Solution",
    description: "Implemented multi-tenant SaaS architecture for financial management."
  }
];

export default function Timeline() {
  return (
    <div className="relative border-l border-gray-800 ml-4 space-y-12 pb-4">
      {timelineEvents.map((event, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="relative pl-10"
        >
          <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary-500 border-4 border-gray-950 shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
          <div className="text-sm text-primary-500 font-medium mb-1">{event.date}</div>
          <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
          <div className="text-gray-400 mb-3">{event.company}</div>
          <p className="text-gray-500 leading-relaxed max-w-xl">{event.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
