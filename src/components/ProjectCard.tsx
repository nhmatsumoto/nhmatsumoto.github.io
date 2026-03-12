import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ProjectProps {
  title: string;
  description: string;
  link: string;
  tags: string[];
}

export default function ProjectCard({ title, description, link, tags }: ProjectProps) {
  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-primary-500/30 hover:bg-gray-900/80 transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold group-hover:text-primary-500 transition-colors">
          {title}
        </h3>
        <ExternalLink size={18} className="text-gray-500 group-hover:text-primary-500 transition-colors" />
      </div>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 group-hover:bg-primary-500/10 group-hover:text-primary-400 transition-colors">
            {tag}
          </span>
        ))}
      </div>
    </a>
  );
}
