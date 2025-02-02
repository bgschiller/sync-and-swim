interface MenuOption {
  id: string;
  title: string;
  description: string;
  component: (props?: any) => JSX.Element;
}

interface MenuProps {
  options: MenuOption[];
  onSelect: (option: MenuOption) => void;
}

function Menu({ options, onSelect }: MenuProps) {
  return (
    <div className="menu">
      <h1>Sync + Swim</h1>
      <div className="menu-options">
        {options.map((option) => (
          <button
            key={option.id}
            className="menu-option"
            onClick={() => onSelect(option)}
          >
            <h2>{option.title}</h2>
            <p>{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Menu;
