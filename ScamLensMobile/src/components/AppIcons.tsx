import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome5,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";

type IconLibrary =
  | "material"
  | "feather"
  | "ion"
  | "ant"
  | "materialCommunity"
  | "font6"
  | "font5"
  | "oct"
  | "en";
type AppIconProps = {
  icon: string; // e.g. "material:sports-cricket"
  size?: number;
  color?: string;
};

export default function AppIcon({
  icon,
  size = 18,
  color = "#111111",
}: AppIconProps) {
  if (!icon || !icon.includes(":")) {
    console.warn("Invalid icon format:", icon);
    return null;
  }

  const [library, name] = icon.split(":") as [IconLibrary, string];

  switch (library) {
    case "material":
      return <MaterialIcons name={name as any} size={size} color={color} />;

    case "feather":
      return <Feather name={name as any} size={size} color={color} />;

    case "ion":
      return <Ionicons name={name as any} size={size} color={color} />;

    case "ant":
      return <AntDesign name={name as any} size={size} color={color} />;

    case "materialCommunity":
      return (
        <MaterialCommunityIcons name={name as any} size={size} color={color} />
      );
    case "font6":
      return <FontAwesome6 name={name as any} size={size} color={color} />;
    case "font5":
      return <FontAwesome5 name={name as any} size={size} color={color} />;
    case "oct":
      return <Octicons name={name as any} size={size} color={color} />;
    case "en":
      return <Entypo name={name as any} size={size} color={color} />;
    default:
      return null;
  }
}
