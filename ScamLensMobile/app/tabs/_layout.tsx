import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Modal, Pressable, Text, TouchableWithoutFeedback } from 'react-native';
import * as LucideIcons from 'lucide-react-native';

const SafeIcon = ({ name, color, size, strokeWidth }: any) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Shield;
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
};

const NoFeedbackTabButton = (props: any) => {
  const { style, ...rest } = props;
  return (
    <Pressable
      {...rest}
      android_ripple={null}
      style={({ pressed }) => [
        style,
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 1,
        },
      ]}
    />
  );
};

export default function TabLayout() {
  const [menu, setMenu] = useState(false);

  const handleChooseMedia = () => {
    console.log("Media");
    setMenu(false);
  };

  const handleChooseCamera = () => {
    console.log("Camera");
    setMenu(false);
  };

  return (
    <View className="flex-1 bg-[#FAFAFC]">
      <Tabs
        id="main-tabs"
        screenOptions={{
          headerShown: false,
          animation: 'none',
          tabBarActiveTintColor: '#1C1C1E',
          tabBarInactiveTintColor: '#AEAEB2',
          tabBarButton: (props) => <NoFeedbackTabButton {...props} />,
          tabBarItemStyle: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          tabBarIconStyle: {
            alignSelf: 'center',
            margin: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 4,
            alignSelf: 'center',
            textAlign: 'center',
          },
          tabBarStyle: {
            position: 'absolute',
            bottom: 30,
            marginLeft: 44,
            marginRight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            backgroundColor: '#FFFFFF',
            borderRadius: 30,
            height: 72,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopWidth: 0,
            elevation: 3,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Analyze',
            tabBarIcon: ({ color, focused }) => (
              <SafeIcon name="Shield" color={color} size={22} strokeWidth={focused ? 2.2 : 1.8} />
            ),
          }}
        />

        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarButton: () => (
              <Pressable
                onPress={() => setMenu(true)}
                android_ripple={null}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 1,
                }}
              >
                <View className="w-20 h-20 bg-[#1C1C1E] items-center justify-center rounded-full -mt-14 shadow-lg ">
                  <SafeIcon 
                    name={menu ? "X" : "ScanLine"} 
                    color="#FFFFFF" 
                    size={24} 
                    strokeWidth={2.2} 
                  />
                </View>
                {/* <Text className="text-[11px] font-bold mt-1 text-[#AEAEB2] text-center">Scan</Text> */}
              </Pressable>
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <SafeIcon name="Settings" color={color} size={22} strokeWidth={focused ? 2.2 : 1.8} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Action Menu Modal */}
      <Modal
        visible={menu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenu(false)}>
          <View className="flex-1 bg-black/15 justify-end items-center pb-[7.5rem]">
            <View className="flex-row gap-6 mb-6 items-center justify-center">
              <View className="items-center">
                <Pressable 
                  onPress={handleChooseMedia}
                  className="w-[4.5rem] h-[4.5rem] bg-white rounded-full items-center justify-center shadow-lg active:opacity-80"
                >
                  <SafeIcon name="Image" color="#1C1C1E" size={26} strokeWidth={2} />
                </Pressable>
              </View>

              <View className="items-center">
                <Pressable 
                  onPress={handleChooseCamera}
                  className="w-[4.5rem] h-[4.5rem] bg-white rounded-full items-center justify-center shadow-lg active:opacity-80"
                >
                  <SafeIcon name="Camera" color="#1C1C1E" size={26} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}