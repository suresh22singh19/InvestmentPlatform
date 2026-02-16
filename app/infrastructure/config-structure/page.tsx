"use client";

import { AppShell } from '@/components/layout/AppShell'
import { PageHeading } from '@/components/layout/PageHeading'
import { ActionCard, Breadcrumb, ConfigurationProgress, ConfigurationProgressCard, ConfigurationSummaryPanel, MasterDataCard } from '@/components/ui'
import { RoomInventory, RoomTypeMaster, StructureBuilder, HardwareMaster, FacilitiesMaster, CompleteHierarchyTree, RoomConfiguration } from '@/components/infrastructure'
import type { RoomInventoryItem } from '@/components/infrastructure'
import { useSearchParams } from 'next/navigation'
import React, { useState } from 'react'



const configurationProgressCards = [
  {
    id: 1,
    title: "Buildings & Structure",
    description: "Define buildings, blocks, and floors",
    value: "2",
    status: "Complete" as const,
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
  {
    id: 2,
    title: "Floors",
    description: "Add floors to each building",
    value: "3",
    status: "Complete" as const,
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
  {
    id: 3,
    title: "Departments",
    description: "Organize hospital departments",
    value: "1",
    status: "Complete" as const,
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
  {
    id: 4,
    title: "Rooms Created",
    description: "Add rooms and spaces",
    value: "2",
    status: "Complete" as const,
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
  {
    id: 5,
    title: "Rooms Configured",
    description: "Hardware, facilities, and details",
    value: "1 / 2",
    status: "In Progress" as const,
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
];

const page = () => {
  const searchParams = useSearchParams();
  const facilityName = searchParams.get('facility') || 'City General Hospital';
  const facilityType = searchParams.get('type') || 'Hospital';
  const facilityAddress = searchParams.get('address') || '123 Healthcare Blvd, Medical District';
  const completionPercentage = parseInt(searchParams.get('completion') || '35');
  const buildings = parseInt(searchParams.get('buildings') || '2');
  const blocks = parseInt(searchParams.get('blocks') || '1');
  const floors = parseInt(searchParams.get('floors') || '3');
  const departments = parseInt(searchParams.get('departments') || '1');
  const totalRooms = parseInt(searchParams.get('totalRooms') || '2');
  const configuredRooms = parseInt(searchParams.get('configuredRooms') || '1');
  const incompleteRooms = parseInt(searchParams.get('incompleteRooms') || '1');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeView, setActiveView] = useState<'structure' | 'inventory' | 'roomType' | 'hardware' | 'facilities' | 'hierarchyTree' | 'roomConfigFromStructure' | null>(null);
  const [roomToEditFromStructure, setRoomToEditFromStructure] = useState<RoomInventoryItem | null>(null);

  /** Build RoomInventoryItem from Structure Builder tree room + context so we can open Room Configuration */
  const handleEditRoomFromStructure = (room: { id: string; name: string; roomNumber?: string; roomType?: string }, context: { building: string; block: string; floor: string }) => {
    const roomItem: RoomInventoryItem = {
      id: room.id,
      roomNumber: room.roomNumber ?? room.name,
      roomType: room.roomType ?? 'Consultation Room',
      building: context.building,
      block: context.block,
      floor: context.floor,
      status: 'incomplete',
      occupancyStatus: 'Vacant',
      capacity: 1,
      genderUsage: 'Mixed',
      hasAC: false,
      hardwareCount: 0,
      facilitiesCount: 0,
    };
    setRoomToEditFromStructure(roomItem);
    setActiveView('roomConfigFromStructure');
    setIsPanelOpen(false);
  };

  const masterDataCards = [
    {
      id: 1,
      title: "Room Types",
      subtitle: "6 types defined",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
      iconBgColor: "bg-green-100",
      onClick: () => {
        setActiveView('roomType');
        setIsPanelOpen(false);
      },
    },
    {
      id: 2,
      title: "Hardware",
      subtitle: "10 items available — click to view list",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      iconBgColor: "bg-green-100",
      onClick: () => {
        setActiveView('hardware');
        setIsPanelOpen(false);
      },
    },
    {
      id: 3,
      title: "Facilities",
      subtitle: "10 items available — click to view list",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ),
      iconBgColor: "bg-green-100",
      onClick: () => {
        setActiveView('facilities');
        setIsPanelOpen(false);
      },
    },
  ];

  const actionCards = [
    {
      id: 1,
      title: "Manage Structure",
      description: "Buildings, blocks, floors & departments",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      buttonLabel: "Configure",
      iconBgColor: "bg-green-100",
      onClick: () => {
        setActiveView('structure');
        setIsPanelOpen(false);
      },
    },
    {
      id: 2,
      title: "Room Inventory",
      description: "View and configure all rooms",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
      buttonLabel: "View All",
      iconBgColor: "bg-green-100",
      onClick: () => {
        setActiveView('inventory');
        setIsPanelOpen(false);
      },
    },
    {
      id: 3,
      title: "Room Type Master",
      description: "Manage custom room types",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
      buttonLabel: "Manage",
      iconBgColor: "bg-green-100",
      onClick: () => {
        setActiveView('roomType');
        setIsPanelOpen(false);
      },
    },
  ];

  const homeIcon = (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );

  const breadcrumbItems = [
    {
      label: 'All Facilities',
      href: '/infrastructure',
      icon: homeIcon,
    },
    {
      label: facilityName,
    },
  ];

  return (
    <AppShell>
      <div className="flex gap-6">
        {/* Main Content - 80% when panel open, 100% when closed */}
        <div className={`transition-all duration-300 ${isPanelOpen ? 'w-[80%]' : 'w-full'}`}>
          {activeView === 'structure' ? (
            <StructureBuilder
              facilityName={facilityName}
              facilityType={facilityType as "Hospital" | "Clinic"}
              onBack={() => setActiveView(null)}
              onEditRoom={handleEditRoomFromStructure}
            />
          ) : activeView === 'roomConfigFromStructure' && roomToEditFromStructure ? (
            <RoomConfiguration
              facilityName={facilityName}
              room={roomToEditFromStructure}
              onBack={() => { setActiveView('structure'); setRoomToEditFromStructure(null); }}
              onSave={() => { setActiveView('structure'); setRoomToEditFromStructure(null); }}
            />
          ) : activeView === 'inventory' ? (
            <RoomInventory facilityName={facilityName} onBack={() => setActiveView(null)} />
          ) : activeView === 'roomType' ? (
            <RoomTypeMaster facilityName={facilityName} onBack={() => setActiveView(null)} />
          ) : activeView === 'hardware' ? (
            <HardwareMaster facilityName={facilityName} onBack={() => setActiveView(null)} />
          ) : activeView === 'facilities' ? (
            <FacilitiesMaster facilityName={facilityName} onBack={() => setActiveView(null)} />
          ) : activeView === 'hierarchyTree' ? (
            <CompleteHierarchyTree facilityName={facilityName} facilityType={facilityType as "Hospital" | "Clinic"} onBack={() => setActiveView(null)} />
          ) : (
            <>
              <div className="space-y-6 border-b border-gray-200 pb-4">
                {/* Breadcrumb Navigation */}
                <Breadcrumb items={breadcrumbItems} />

                {/* Hospital Details */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-semibold text-gray-900">{facilityName}</p>
                      <p className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
                        {facilityType}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">{facilityAddress}</p>
                  </div>
                  
                  {/* Open Panel Button - Show when panel is closed */}
                  {!isPanelOpen && (
                    <button
                      onClick={() => setIsPanelOpen(true)}
                      className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg transition-all hover:bg-green-700"
                      aria-label="Open panel"
                    >
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Configuration Progress Card */}
                <ConfigurationProgress completionPercentage={completionPercentage} />
              </div>

              {/* Action Cards */}
              <div className=" grid grid-cols-1 gap-6 md:grid-cols-3">
                {actionCards.map((card: typeof actionCards[0]) => (
                  <ActionCard
                    key={card.id}
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    buttonLabel={card.buttonLabel}
                    iconBgColor={card.iconBgColor}
                    onButtonClick={card.onClick}
                  />
                ))}
              </div>

              {/* Master Data Configuration */}
              <div className="mt-4">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Master Data Configuration</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {masterDataCards.map((card: typeof masterDataCards[0]) => (
                    <MasterDataCard
                      key={card.id}
                      title={card.title}
                      subtitle={card.subtitle}
                      icon={card.icon}
                      iconBgColor={card.iconBgColor}
                      onButtonClick={card.onClick}
                      buttonLabel={card.id === 2 || card.id === 3 ? "View list" : undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Configuration Progress */}
              <div className="mt-4">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Configuration Progress</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {configurationProgressCards.map((card) => (
                    <ConfigurationProgressCard
                      key={card.id}
                      title={card.title}
                      description={card.description}
                      value={card.value}
                      status={card.status}
                      icon={card.icon}
                      iconBgColor={card.iconBgColor}
                    />
                  ))}
                </div>
              </div>

              {/* Complete Hierarchy Tree Card */}
              <div className="mt-4">
                <div className="rounded-[12px] border border-gray-200 bg-white p-4 ">
                  <div className="flex items-center justify-between gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 h-14 w-14 flex items-center justify-center rounded-lg bg-green-100">
                      <svg
                        className="h-7 w-7 text-green-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {/* Top node */}
                        <rect x="9" y="2" width="6" height="6" rx="1" fill="currentColor" />
                        {/* Bottom left node */}
                        <rect x="2" y="14" width="6" height="6" rx="1" fill="currentColor" />
                        {/* Bottom right node */}
                        <rect x="16" y="14" width="6" height="6" rx="1" fill="currentColor" />
                        {/* Connecting lines */}
                        <line x1="12" y1="8" x2="5" y2="14" stroke="currentColor" strokeWidth="2" />
                        <line x1="12" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">Complete Hierarchy Tree</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        View the complete structure including all buildings, floors, departments, rooms, and beds in an expandable tree view
                      </p>
                    </div>

                    {/* Button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => {
                          setActiveView('hierarchyTree');
                          setIsPanelOpen(false);
                        }}
                        className="rounded-[12px] bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 whitespace-nowrap"
                      >
                        View Tree
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* What's Next Section */}
              <div className="mt-4">
                <div className="rounded-[12px] border border-gray-200 bg-white p-4 ">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h2>

                  <div className="flex items-start gap-4">
                    {/* Step Number Icon */}
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-green-600">
                      <span className="text-white font-semibold text-base">4</span>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Configure Rooms</h3>
                      <p className="text-sm text-gray-600">
                        Add hardware, facilities, and detailed specifications for each room
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Side Panel - 20% - Always visible when panel is open */}
        <ConfigurationSummaryPanel
          facilityName={facilityName}
          facilityType={facilityType as "Hospital" | "Clinic"}
          completionPercentage={completionPercentage}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          buildings={buildings}
          blocks={blocks}
          floors={floors}
          departments={departments}
          totalRooms={totalRooms}
          configuredRooms={configuredRooms}
          incompleteRooms={incompleteRooms}
        />

      </div>
    </AppShell>
  )
}
export default page
