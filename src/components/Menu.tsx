import { useState } from "react";

interface MenuOption {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
}

interface MenuProps {
  options: MenuOption[];
  onSelect: (option: MenuOption) => void;
}

function Menu({ options, onSelect }: MenuProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  return (
    <div className="menu">
      <h1>Audio File Manager</h1>
      <div className="menu-options">
        {options.map((option) => (
          <button
            key={option.id}
            className="menu-option"
            onClick={() => onSelect(option)}
            onMouseEnter={() => setHoveredOption(option.id)}
            onMouseLeave={() => setHoveredOption(null)}
          >
            <h2>{option.title}</h2>
            <p className={hoveredOption === option.id ? 'description-visible' : ''}>
              {option.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Menu;
