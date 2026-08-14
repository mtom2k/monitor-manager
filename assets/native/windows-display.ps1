param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('list', 'apply', 'hdr', 'debug', 'debugall')]
  [string]$Command,
  [string]$PayloadBase64 = ''
)

$ErrorActionPreference = 'Stop'

$nativeSource = @'
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Web.Script.Serialization;

public static class MonitorManagerNative
{
    private const int ENUM_CURRENT_SETTINGS = -1;
    private const int ENUM_REGISTRY_SETTINGS = -2;
    private const uint EDD_GET_DEVICE_INTERFACE_NAME = 0x00000001;
    private const uint DISPLAY_DEVICE_ATTACHED_TO_DESKTOP = 0x00000001;
    private const uint DISPLAY_DEVICE_PRIMARY_DEVICE = 0x00000004;
    private const uint DISPLAY_DEVICE_MIRRORING_DRIVER = 0x00000008;
    private const uint DM_POSITION = 0x00000020;
    private const uint DM_DISPLAYORIENTATION = 0x00000080;
    private const uint DM_BITSPERPEL = 0x00040000;
    private const uint DM_PELSWIDTH = 0x00080000;
    private const uint DM_PELSHEIGHT = 0x00100000;
    private const uint DM_DISPLAYFREQUENCY = 0x00400000;
    private const uint CDS_UPDATEREGISTRY = 0x00000001;
    private const uint CDS_NORESET = 0x10000000;
    private const uint CDS_SET_PRIMARY = 0x00000010;
    private const int DISP_CHANGE_SUCCESSFUL = 0;
    private const uint QDC_ALL_PATHS = 0x00000001;
    private const uint QDC_ONLY_ACTIVE_PATHS = 0x00000002;
    private const uint DISPLAYCONFIG_PATH_ACTIVE = 0x00000001;
    private const uint DISPLAYCONFIG_PATH_MODE_IDX_INVALID = 0xFFFFFFFF;
    private const uint SDC_TOPOLOGY_SUPPLIED = 0x00000010;
    private const uint SDC_TOPOLOGY_EXTEND = 0x00000004;
    private const uint SDC_USE_SUPPLIED_DISPLAY_CONFIG = 0x00000020;
    private const uint SDC_APPLY = 0x00000080;
    private const uint SDC_SAVE_TO_DATABASE = 0x00000200;
    private const uint SDC_ALLOW_CHANGES = 0x00000400;
    private const uint SDC_ALLOW_PATH_ORDER_CHANGES = 0x00002000;
    private const uint DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME = 1;
    private const uint DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME = 2;
    private const uint DISPLAYCONFIG_DEVICE_INFO_GET_ADVANCED_COLOR_INFO = 9;
    private const uint DISPLAYCONFIG_DEVICE_INFO_SET_ADVANCED_COLOR_STATE = 10;
    private const uint DISPLAYCONFIG_DEVICE_INFO_GET_DPI_SCALE = 0xFFFFFFFD;
    private const uint DISPLAYCONFIG_DEVICE_INFO_SET_DPI_SCALE = 0xFFFFFFFC;
    private const int ERROR_SUCCESS = 0;
    private static readonly int[] DpiScaleValues = new int[] { 100, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500 };

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DISPLAY_DEVICE
    {
        public int cb;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
        public uint StateFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DEVMODE
    {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
        public ushort dmSpecVersion;
        public ushort dmDriverVersion;
        public ushort dmSize;
        public ushort dmDriverExtra;
        public uint dmFields;
        public POINTL dmPosition;
        public uint dmDisplayOrientation;
        public uint dmDisplayFixedOutput;
        public short dmColor;
        public short dmDuplex;
        public short dmYResolution;
        public short dmTTOption;
        public short dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
        public ushort dmLogPixels;
        public uint dmBitsPerPel;
        public uint dmPelsWidth;
        public uint dmPelsHeight;
        public uint dmDisplayFlags;
        public uint dmDisplayFrequency;
        public uint dmICMMethod;
        public uint dmICMIntent;
        public uint dmMediaType;
        public uint dmDitherType;
        public uint dmReserved1;
        public uint dmReserved2;
        public uint dmPanningWidth;
        public uint dmPanningHeight;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINTL { public int x; public int y; }

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT { public int left; public int top; public int right; public int bottom; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct MONITORINFOEX
    {
        public uint cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szDevice;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct LUID { public uint LowPart; public int HighPart; }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_RATIONAL { public uint Numerator; public uint Denominator; }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_PATH_SOURCE_INFO
    {
        public LUID adapterId;
        public uint id;
        public uint modeInfoIdx;
        public uint statusFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_PATH_TARGET_INFO
    {
        public LUID adapterId;
        public uint id;
        public uint modeInfoIdx;
        public uint outputTechnology;
        public uint rotation;
        public uint scaling;
        public DISPLAYCONFIG_RATIONAL refreshRate;
        public uint scanLineOrdering;
        [MarshalAs(UnmanagedType.Bool)] public bool targetAvailable;
        public uint statusFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_PATH_INFO
    {
        public DISPLAYCONFIG_PATH_SOURCE_INFO sourceInfo;
        public DISPLAYCONFIG_PATH_TARGET_INFO targetInfo;
        public uint flags;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_2DREGION { public uint cx; public uint cy; }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_VIDEO_SIGNAL_INFO
    {
        public ulong pixelRate;
        public DISPLAYCONFIG_RATIONAL hSyncFreq;
        public DISPLAYCONFIG_RATIONAL vSyncFreq;
        public DISPLAYCONFIG_2DREGION activeSize;
        public DISPLAYCONFIG_2DREGION totalSize;
        public uint videoStandard;
        public uint scanLineOrdering;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_TARGET_MODE { public DISPLAYCONFIG_VIDEO_SIGNAL_INFO targetVideoSignalInfo; }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_SOURCE_MODE
    {
        public uint width;
        public uint height;
        public uint pixelFormat;
        public POINTL position;
    }

    [StructLayout(LayoutKind.Explicit, Size = 64)]
    private struct DISPLAYCONFIG_MODE_INFO
    {
        [FieldOffset(0)] public uint infoType;
        [FieldOffset(4)] public uint id;
        [FieldOffset(8)] public LUID adapterId;
        [FieldOffset(16)] public DISPLAYCONFIG_TARGET_MODE targetMode;
        [FieldOffset(16)] public DISPLAYCONFIG_SOURCE_MODE sourceMode;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_DEVICE_INFO_HEADER
    {
        public uint type;
        public uint size;
        public LUID adapterId;
        public uint id;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DISPLAYCONFIG_SOURCE_DEVICE_NAME
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string viewGdiDeviceName;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DISPLAYCONFIG_TARGET_DEVICE_NAME
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint flags;
        public uint outputTechnology;
        public ushort edidManufactureId;
        public ushort edidProductCodeId;
        public uint connectorInstance;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string monitorFriendlyDeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string monitorDevicePath;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public uint value;
        public uint colorEncoding;
        public uint bitsPerColorChannel;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        [MarshalAs(UnmanagedType.Bool)] public bool enableAdvancedColor;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_SOURCE_DPI_SCALE_GET
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public int minScaleRel;
        public int curScaleRel;
        public int maxScaleRel;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_SOURCE_DPI_SCALE_SET
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER header;
        public int scaleRel;
    }

    private delegate bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool EnumDisplayDevices(string lpDevice, uint iDevNum, ref DISPLAY_DEVICE lpDisplayDevice, uint dwFlags);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool EnumDisplaySettingsEx(string lpszDeviceName, int iModeNum, ref DEVMODE lpDevMode, uint dwFlags);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int ChangeDisplaySettingsEx(string lpszDeviceName, ref DEVMODE lpDevMode, IntPtr hwnd, uint dwflags, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "ChangeDisplaySettingsExW")]
    private static extern int ChangeDisplaySettingsExCommit(string lpszDeviceName, IntPtr lpDevMode, IntPtr hwnd, uint dwflags, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumProc lpfnEnum, IntPtr dwData);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFOEX lpmi);

    [DllImport("shcore.dll")]
    private static extern int GetDpiForMonitor(IntPtr hmonitor, int dpiType, out uint dpiX, out uint dpiY);

    [DllImport("shcore.dll")]
    private static extern int SetProcessDpiAwareness(int value);

    [DllImport("user32.dll")]
    private static extern int GetDisplayConfigBufferSizes(uint flags, out uint numPathArrayElements, out uint numModeInfoArrayElements);

    [DllImport("user32.dll")]
    private static extern int QueryDisplayConfig(uint flags, ref uint numPathArrayElements, [Out] DISPLAYCONFIG_PATH_INFO[] pathInfoArray, ref uint numModeInfoArrayElements, [Out] DISPLAYCONFIG_MODE_INFO[] modeInfoArray, IntPtr currentTopologyId);

    [DllImport("user32.dll")]
    private static extern int SetDisplayConfig(uint numPathArrayElements, [In] DISPLAYCONFIG_PATH_INFO[] pathArray, uint numModeInfoArrayElements, [In] DISPLAYCONFIG_MODE_INFO[] modeInfoArray, uint flags);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")]
    private static extern int DisplayConfigGetSourceName(ref DISPLAYCONFIG_SOURCE_DEVICE_NAME requestPacket);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")]
    private static extern int DisplayConfigGetTargetName(ref DISPLAYCONFIG_TARGET_DEVICE_NAME requestPacket);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")]
    private static extern int DisplayConfigGetAdvancedColorInfo(ref DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO requestPacket);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigSetDeviceInfo")]
    private static extern int DisplayConfigSetAdvancedColorState(ref DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE requestPacket);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")]
    private static extern int DisplayConfigGetDpiScale(ref DISPLAYCONFIG_SOURCE_DPI_SCALE_GET requestPacket);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigSetDeviceInfo")]
    private static extern int DisplayConfigSetDpiScale(ref DISPLAYCONFIG_SOURCE_DPI_SCALE_SET requestPacket);

    public sealed class BoundsDto { public int x { get; set; } public int y { get; set; } public int width { get; set; } public int height { get; set; } }
    public sealed class ModeDto { public int width { get; set; } public int height { get; set; } public double refreshRate { get; set; } public int bitDepth { get; set; } public bool interlaced { get; set; } }
    public sealed class DisplayDto
    {
        public string id { get; set; }
        public string systemId { get; set; }
        public string name { get; set; }
        public string adapterName { get; set; }
        public string connection { get; set; }
        public bool enabled { get; set; }
        public bool mirrored { get; set; }
        public bool primary { get; set; }
        public bool hdrSupported { get; set; }
        public bool hdrEnabled { get; set; }
        public BoundsDto bounds { get; set; }
        public ModeDto mode { get; set; }
        public int rotation { get; set; }
        public int scalePercent { get; set; }
        public List<int> availableScalePercents { get; set; }
        public List<ModeDto> availableModes { get; set; }
    }
    public sealed class ProfileDisplayDto
    {
        public string displayId { get; set; }
        public string fallbackSystemId { get; set; }
        public string name { get; set; }
        public bool enabled { get; set; }
        public bool primary { get; set; }
        public bool hdrEnabled { get; set; }
        public BoundsDto bounds { get; set; }
        public ModeDto mode { get; set; }
        public int rotation { get; set; }
        public int scalePercent { get; set; }
    }
    public sealed class ProfileDto { public string id { get; set; } public string name { get; set; } public List<ProfileDisplayDto> displays { get; set; } }
    public sealed class HdrPayloadDto { public string displayId { get; set; } public bool enabled { get; set; } }
    public sealed class ResponseDto
    {
        public bool ok { get; set; }
        public string message { get; set; }
        public List<string> warnings { get; set; }
        public List<DisplayDto> data { get; set; }
    }

    private sealed class CcdDescriptor
    {
        public string GdiName;
        public string FriendlyName;
        public string DevicePath;
        public string Connection;
        public bool Active;
        public bool TargetAvailable;
        public bool HdrSupported;
        public bool HdrEnabled;
        public bool Mirrored;
        public string SourceKey;
        public LUID AdapterId;
        public uint TargetId;
    }

    private sealed class PathCandidate
    {
        public DISPLAYCONFIG_PATH_INFO Path;
        public ProfileDisplayDto Desired;
        public string StableId;
        public string GdiName;
        public bool Active;
        public bool Available;
    }

    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer { MaxJsonLength = 8 * 1024 * 1024 };

    public static string ListJson()
    {
        try
        {
            return Serializer.Serialize(new ResponseDto { ok = true, message = "Displays discovered.", data = ListDisplaysInternal(), warnings = new List<string>() });
        }
        catch (Exception ex)
        {
            return Serializer.Serialize(new ResponseDto { ok = false, message = ex.Message, warnings = new List<string>(), data = new List<DisplayDto>() });
        }
    }

    public static string DebugCcdJson()
    {
        return DebugCcdJsonForFlags(QDC_ONLY_ACTIVE_PATHS);
    }

    public static string DebugAllCcdJson()
    {
        return DebugCcdJsonForFlags(QDC_ALL_PATHS);
    }

    private static string DebugCcdJsonForFlags(uint queryFlags)
    {
        DISPLAYCONFIG_PATH_INFO[] paths;
        DISPLAYCONFIG_MODE_INFO[] modes;
        string error;
        if (!QueryCcd(queryFlags, out paths, out modes, out error)) return Serializer.Serialize(new { ok = false, message = error });
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        foreach (DISPLAYCONFIG_PATH_INFO path in paths)
        {
            DISPLAYCONFIG_SOURCE_DEVICE_NAME source = GetSourceName(path);
            DISPLAYCONFIG_TARGET_DEVICE_NAME target = GetTargetName(path);
            Dictionary<string, object> item = new Dictionary<string, object>();
            item["source"] = source.viewGdiDeviceName;
            item["target"] = target.monitorFriendlyDeviceName;
            item["path"] = target.monitorDevicePath;
            item["flags"] = path.flags;
            item["available"] = path.targetInfo.targetAvailable;
            item["sourceModeIndex"] = path.sourceInfo.modeInfoIdx;
            item["targetModeIndex"] = path.targetInfo.modeInfoIdx;
            if (path.sourceInfo.modeInfoIdx != DISPLAYCONFIG_PATH_MODE_IDX_INVALID && path.sourceInfo.modeInfoIdx < modes.Length)
            {
                DISPLAYCONFIG_SOURCE_MODE mode = modes[path.sourceInfo.modeInfoIdx].sourceMode;
                item["sourceMode"] = mode.width + "x" + mode.height + "@(" + mode.position.x + "," + mode.position.y + ")";
            }
            items.Add(item);
        }
        return Serializer.Serialize(new { ok = true, paths = items });
    }

    public static string SetHdrJson(string payloadJson)
    {
        try
        {
            HdrPayloadDto payload = Serializer.Deserialize<HdrPayloadDto>(payloadJson);
            List<DisplayDto> displays = ListDisplaysInternal();
            DisplayDto display = displays.FirstOrDefault(d => EqualId(d.id, payload.displayId));
            if (display == null) return Fail("The selected display is no longer connected.");
            if (!display.enabled) return Fail("Enable the display before changing HDR.");
            CcdDescriptor ccd = GetCcdDescriptors().Where(d => EqualId(BuildStableId(d.DevicePath, display.systemId), display.id)).OrderByDescending(d => d.Active).FirstOrDefault();
            if (ccd == null || !ccd.HdrSupported) return Fail("This display or graphics driver does not expose HDR control.");
            string error;
            if (!SetHdr(ccd, payload.enabled, out error)) return Fail(error);
            Thread.Sleep(450);
            return Serializer.Serialize(new ResponseDto { ok = true, message = payload.enabled ? "HDR enabled." : "HDR disabled.", data = ListDisplaysInternal(), warnings = new List<string>() });
        }
        catch (Exception ex) { return Fail(ex.Message); }
    }

    public static string ApplyJson(string payloadJson)
    {
        try
        {
            ProfileDto profile = Serializer.Deserialize<ProfileDto>(payloadJson);
            if (profile == null || profile.displays == null) return Fail("The profile is invalid.");
            List<ProfileDisplayDto> enabled = profile.displays.Where(d => d.enabled).ToList();
            if (enabled.Count == 0) return Fail("A display profile must keep at least one monitor enabled.");
            ProfileDisplayDto primary = enabled.FirstOrDefault(d => d.primary) ?? enabled[0];
            int originX = primary.bounds != null ? primary.bounds.x : 0;
            int originY = primary.bounds != null ? primary.bounds.y : 0;
            List<string> warnings = new List<string>();
            string ccdError;
            if (!ApplyCcdProfile(profile, originX, originY, warnings, out ccdError))
                return Serializer.Serialize(new ResponseDto { ok = false, message = ccdError, warnings = warnings, data = ListDisplaysInternal() });

            Thread.Sleep(1000);
            ApplyDpiScales(profile, warnings);
            Thread.Sleep(250);
            List<CcdDescriptor> ccdDisplays = GetCcdDescriptors();
            List<DisplayDto> refreshed = ListDisplaysInternal();
            foreach (ProfileDisplayDto desired in enabled)
            {
                DisplayDto resolved = refreshed.FirstOrDefault(d => EqualId(d.id, desired.displayId))
                    ?? refreshed.FirstOrDefault(d => EqualId(d.systemId, desired.fallbackSystemId));
                if (resolved == null || !resolved.enabled || !resolved.hdrSupported || resolved.hdrEnabled == desired.hdrEnabled) continue;
                CcdDescriptor descriptor = ccdDisplays.FirstOrDefault(d => EqualId(BuildStableId(d.DevicePath, resolved.systemId), resolved.id));
                if (descriptor == null) continue;
                string hdrError;
                if (!SetHdr(descriptor, desired.hdrEnabled, out hdrError)) warnings.Add(resolved.name + ": " + hdrError);
            }
            if (enabled.Any(d => d.hdrEnabled)) Thread.Sleep(400);

            return Serializer.Serialize(new ResponseDto
            {
                ok = true,
                message = "Applied to " + profile.name + ".",
                warnings = warnings,
                data = ListDisplaysInternal()
            });
        }
        catch (Exception ex) { return Fail(ex.Message); }
    }

    private static bool ApplyCcdProfile(ProfileDto profile, int originX, int originY, List<string> warnings, out string error)
    {
        DISPLAYCONFIG_PATH_INFO[] allPaths;
        DISPLAYCONFIG_MODE_INFO[] allModes;
        if (!QueryCcd(QDC_ALL_PATHS, out allPaths, out allModes, out error)) return false;

        List<PathCandidate> candidates = new List<PathCandidate>();
        foreach (DISPLAYCONFIG_PATH_INFO path in allPaths)
        {
            DISPLAYCONFIG_SOURCE_DEVICE_NAME source = GetSourceName(path);
            DISPLAYCONFIG_TARGET_DEVICE_NAME target = GetTargetName(path);
            if (String.IsNullOrWhiteSpace(source.viewGdiDeviceName)) continue;
            string stableId = BuildStableId(target.monitorDevicePath, source.viewGdiDeviceName);
            ProfileDisplayDto desired = FindDesiredDisplay(profile.displays, stableId, source.viewGdiDeviceName, false);
            if (desired == null) continue;
            candidates.Add(new PathCandidate
            {
                Path = path,
                Desired = desired,
                StableId = stableId,
                GdiName = source.viewGdiDeviceName,
                Active = (path.flags & DISPLAYCONFIG_PATH_ACTIVE) != 0,
                Available = path.targetInfo.targetAvailable
            });
        }

        List<ProfileDisplayDto> desiredEnabled = profile.displays.Where(d => d.enabled).OrderByDescending(d => d.primary).ToList();
        List<PathCandidate> selected = new List<PathCandidate>();
        HashSet<string> usedSources = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (ProfileDisplayDto desired in desiredEnabled)
        {
            PathCandidate chosen = candidates
                .Where(c => Object.ReferenceEquals(c.Desired, desired) && !usedSources.Contains(SourceKey(c.Path)))
                .OrderByDescending(c => c.Active)
                .ThenByDescending(c => c.Available)
                .FirstOrDefault();
            if (chosen == null)
            {
                error = "Windows could not find an available path for " + desired.name + ".";
                return false;
            }
            selected.Add(chosen);
            usedSources.Add(SourceKey(chosen.Path));
        }

        HashSet<string> currentActive = new HashSet<string>(candidates.Where(c => c.Active).Select(c => c.StableId), StringComparer.OrdinalIgnoreCase);
        HashSet<string> requestedActive = new HashSet<string>(selected.Select(c => c.StableId), StringComparer.OrdinalIgnoreCase);
        bool cloneActive = allPaths
            .Where(path => (path.flags & DISPLAYCONFIG_PATH_ACTIVE) != 0)
            .GroupBy(path => SourceKey(path), StringComparer.OrdinalIgnoreCase)
            .Any(group => group.Select(path => TargetKey(path)).Distinct(StringComparer.OrdinalIgnoreCase).Count() > 1);
        if (cloneActive)
        {
            int extendResult = SetDisplayConfig(0, null, 0, null, SDC_APPLY | SDC_TOPOLOGY_EXTEND);
            if (extendResult != ERROR_SUCCESS)
            {
                error = "Windows could not leave Duplicate mode (error " + extendResult + "). Choose Extend in Win+P and try again.";
                return false;
            }
            warnings.Add("Windows Duplicate mode was replaced with an extended layout.");
            Thread.Sleep(1000);
            return ApplyCcdProfile(profile, originX, originY, warnings, out error);
        }
        bool topologyChanged = !currentActive.SetEquals(requestedActive);
        if (topologyChanged)
        {
            DISPLAYCONFIG_PATH_INFO[] topologyPaths = selected.Select(candidate =>
            {
                DISPLAYCONFIG_PATH_INFO path = candidate.Path;
                path.flags |= DISPLAYCONFIG_PATH_ACTIVE;
                path.sourceInfo.modeInfoIdx = DISPLAYCONFIG_PATH_MODE_IDX_INVALID;
                path.targetInfo.modeInfoIdx = DISPLAYCONFIG_PATH_MODE_IDX_INVALID;
                return path;
            }).ToArray();
            int topologyResult = SetDisplayConfig(
                (uint)topologyPaths.Length,
                topologyPaths,
                0,
                null,
                SDC_APPLY | SDC_USE_SUPPLIED_DISPLAY_CONFIG | SDC_ALLOW_CHANGES | SDC_SAVE_TO_DATABASE);
            if (topologyResult != ERROR_SUCCESS)
            {
                error = "Windows could not activate the requested monitor set (error " + topologyResult + ").";
                return false;
            }
            Thread.Sleep(900);
        }

        DISPLAYCONFIG_PATH_INFO[] activePaths;
        DISPLAYCONFIG_MODE_INFO[] activeModes;
        if (!QueryCcd(QDC_ONLY_ACTIVE_PATHS, out activePaths, out activeModes, out error)) return false;
        for (int pathIndex = 0; pathIndex < activePaths.Length; pathIndex++)
        {
            DISPLAYCONFIG_PATH_INFO path = activePaths[pathIndex];
            DISPLAYCONFIG_SOURCE_DEVICE_NAME source = GetSourceName(path);
            DISPLAYCONFIG_TARGET_DEVICE_NAME target = GetTargetName(path);
            string stableId = BuildStableId(target.monitorDevicePath, source.viewGdiDeviceName);
            ProfileDisplayDto desired = FindDesiredDisplay(profile.displays, stableId, source.viewGdiDeviceName, true);
            if (desired == null || desired.mode == null || desired.bounds == null) continue;
            if (path.sourceInfo.modeInfoIdx == DISPLAYCONFIG_PATH_MODE_IDX_INVALID || path.sourceInfo.modeInfoIdx >= activeModes.Length)
            {
                warnings.Add("Windows did not expose a source mode for " + desired.name + ".");
                continue;
            }

            int sourceModeIndex = (int)path.sourceInfo.modeInfoIdx;
            DISPLAYCONFIG_MODE_INFO sourceMode = activeModes[sourceModeIndex];
            bool hasRequestedGeometry = desired.mode.width > 0 && desired.mode.height > 0 && desired.bounds.width > 0 && desired.bounds.height > 0;
            bool resolutionChanged = hasRequestedGeometry && (sourceMode.sourceMode.width != (uint)desired.mode.width || sourceMode.sourceMode.height != (uint)desired.mode.height);
            if (hasRequestedGeometry)
            {
                sourceMode.sourceMode.width = (uint)desired.mode.width;
                sourceMode.sourceMode.height = (uint)desired.mode.height;
                sourceMode.sourceMode.position.x = desired.bounds.x - originX;
                sourceMode.sourceMode.position.y = desired.bounds.y - originY;
            }
            activeModes[sourceModeIndex] = sourceMode;

            if (hasRequestedGeometry) path.targetInfo.rotation = RotationToCcd(desired.rotation);
            double currentRefresh = path.targetInfo.refreshRate.Denominator == 0 ? 0 : path.targetInfo.refreshRate.Numerator / (double)path.targetInfo.refreshRate.Denominator;
            bool refreshChanged = hasRequestedGeometry && desired.mode.refreshRate > 1 && Math.Abs(currentRefresh - desired.mode.refreshRate) > 0.6;
            if (hasRequestedGeometry && desired.mode.refreshRate > 1)
            {
                path.targetInfo.refreshRate.Numerator = (uint)Math.Round(desired.mode.refreshRate * 1000.0);
                path.targetInfo.refreshRate.Denominator = 1000;
            }
            if (resolutionChanged || refreshChanged) path.targetInfo.modeInfoIdx = DISPLAYCONFIG_PATH_MODE_IDX_INVALID;
            activePaths[pathIndex] = path;
        }

        int modeResult = SetDisplayConfig(
            (uint)activePaths.Length,
            activePaths,
            (uint)activeModes.Length,
            activeModes,
            SDC_APPLY | SDC_USE_SUPPLIED_DISPLAY_CONFIG | SDC_ALLOW_CHANGES | SDC_SAVE_TO_DATABASE);
        if (modeResult != ERROR_SUCCESS)
        {
            error = "Windows could not commit the display arrangement (error " + modeResult + ").";
            return false;
        }
        error = null;
        return true;
    }

    private static bool QueryCcd(uint flags, out DISPLAYCONFIG_PATH_INFO[] paths, out DISPLAYCONFIG_MODE_INFO[] modes, out string error)
    {
        paths = new DISPLAYCONFIG_PATH_INFO[0];
        modes = new DISPLAYCONFIG_MODE_INFO[0];
        for (int attempt = 0; attempt < 3; attempt++)
        {
            uint pathCount, modeCount;
            int sizeResult = GetDisplayConfigBufferSizes(flags, out pathCount, out modeCount);
            if (sizeResult != ERROR_SUCCESS)
            {
                error = "Windows could not size the display configuration buffer (error " + sizeResult + ").";
                return false;
            }
            DISPLAYCONFIG_PATH_INFO[] pathBuffer = new DISPLAYCONFIG_PATH_INFO[Math.Max(1, pathCount)];
            DISPLAYCONFIG_MODE_INFO[] modeBuffer = new DISPLAYCONFIG_MODE_INFO[Math.Max(1, modeCount)];
            int queryResult = QueryDisplayConfig(flags, ref pathCount, pathBuffer, ref modeCount, modeBuffer, IntPtr.Zero);
            if (queryResult == ERROR_SUCCESS)
            {
                paths = pathBuffer.Take((int)pathCount).ToArray();
                modes = modeBuffer.Take((int)modeCount).ToArray();
                error = null;
                return true;
            }
            if (queryResult != 122)
            {
                error = "Windows could not query the display configuration (error " + queryResult + ").";
                return false;
            }
        }
        error = "The display configuration changed repeatedly while it was being read.";
        return false;
    }

    private static DISPLAYCONFIG_SOURCE_DEVICE_NAME GetSourceName(DISPLAYCONFIG_PATH_INFO path)
    {
        DISPLAYCONFIG_SOURCE_DEVICE_NAME source = new DISPLAYCONFIG_SOURCE_DEVICE_NAME();
        source.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME;
        source.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SOURCE_DEVICE_NAME));
        source.header.adapterId = path.sourceInfo.adapterId;
        source.header.id = path.sourceInfo.id;
        DisplayConfigGetSourceName(ref source);
        return source;
    }

    private static DISPLAYCONFIG_TARGET_DEVICE_NAME GetTargetName(DISPLAYCONFIG_PATH_INFO path)
    {
        DISPLAYCONFIG_TARGET_DEVICE_NAME target = new DISPLAYCONFIG_TARGET_DEVICE_NAME();
        target.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME;
        target.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_TARGET_DEVICE_NAME));
        target.header.adapterId = path.targetInfo.adapterId;
        target.header.id = path.targetInfo.id;
        DisplayConfigGetTargetName(ref target);
        return target;
    }

    private static string SourceKey(DISPLAYCONFIG_PATH_INFO path)
    {
        return path.sourceInfo.adapterId.HighPart + ":" + path.sourceInfo.adapterId.LowPart + ":" + path.sourceInfo.id;
    }

    private static string TargetKey(DISPLAYCONFIG_PATH_INFO path)
    {
        return path.targetInfo.adapterId.HighPart + ":" + path.targetInfo.adapterId.LowPart + ":" + path.targetInfo.id;
    }

    private static ProfileDisplayDto FindDesiredDisplay(IEnumerable<ProfileDisplayDto> displays, string stableId, string fallbackSystemId, bool enabledOnly)
    {
        IEnumerable<ProfileDisplayDto> candidates = enabledOnly ? displays.Where(d => d.enabled) : displays;
        return candidates.FirstOrDefault(d => EqualId(d.displayId, stableId))
            ?? candidates.FirstOrDefault(d => EqualId(d.fallbackSystemId, fallbackSystemId));
    }

    private static List<DisplayDto> ListDisplaysInternal()
    {
        List<CcdDescriptor> ccd = GetCcdDescriptors();
        Dictionary<string, int> scales = GetDpiScales();
        Dictionary<string, List<int>> scaleOptions = GetDpiScaleOptions(scales);
        List<DisplayDto> result = new List<DisplayDto>();
        for (uint index = 0; ; index++)
        {
            DISPLAY_DEVICE adapter = CreateDisplayDevice();
            if (!EnumDisplayDevices(null, index, ref adapter, 0)) break;
            if ((adapter.StateFlags & DISPLAY_DEVICE_MIRRORING_DRIVER) != 0 || String.IsNullOrWhiteSpace(adapter.DeviceName)) continue;

            DISPLAY_DEVICE child = CreateDisplayDevice();
            DISPLAY_DEVICE firstChild = CreateDisplayDevice();
            bool hasChild = false;
            for (uint childIndex = 0; ; childIndex++)
            {
                DISPLAY_DEVICE candidate = CreateDisplayDevice();
                if (!EnumDisplayDevices(adapter.DeviceName, childIndex, ref candidate, EDD_GET_DEVICE_INTERFACE_NAME)) break;
                if (!hasChild) { firstChild = candidate; hasChild = true; }
                if ((candidate.StateFlags & DISPLAY_DEVICE_ATTACHED_TO_DESKTOP) != 0) { child = candidate; break; }
            }
            if (String.IsNullOrEmpty(child.DeviceName) && hasChild) child = firstChild;

            bool attached = (adapter.StateFlags & DISPLAY_DEVICE_ATTACHED_TO_DESKTOP) != 0;
            DEVMODE current = CreateDevMode();
            bool hasMode = EnumDisplaySettingsEx(adapter.DeviceName, ENUM_CURRENT_SETTINGS, ref current, 0);
            if (!hasMode) hasMode = EnumDisplaySettingsEx(adapter.DeviceName, ENUM_REGISTRY_SETTINGS, ref current, 0);
            CcdDescriptor descriptor = ccd.Where(d => EqualId(d.GdiName, adapter.DeviceName)).OrderByDescending(d => d.Active).ThenByDescending(d => d.TargetAvailable).FirstOrDefault();
            bool enabled = (descriptor != null ? descriptor.Active : attached) && hasMode && current.dmPelsWidth > 0 && current.dmPelsHeight > 0;
            if (!attached && (descriptor == null || (!descriptor.TargetAvailable && !descriptor.Active))) continue;
            string devicePath = descriptor != null ? descriptor.DevicePath : child.DeviceID;
            string stableId = BuildStableId(devicePath, adapter.DeviceName);
            string friendly = descriptor != null && !String.IsNullOrWhiteSpace(descriptor.FriendlyName) ? descriptor.FriendlyName : child.DeviceString;
            if (String.IsNullOrWhiteSpace(friendly) || friendly.Equals("Generic PnP Monitor", StringComparison.OrdinalIgnoreCase)) friendly = "Display " + (result.Count + 1);

            List<ModeDto> modes = EnumerateModes(adapter.DeviceName);
            ModeDto activeMode = new ModeDto
            {
                width = hasMode ? (int)current.dmPelsWidth : 0,
                height = hasMode ? (int)current.dmPelsHeight : 0,
                refreshRate = hasMode ? current.dmDisplayFrequency : 0,
                bitDepth = hasMode ? (int)current.dmBitsPerPel : 0,
                interlaced = hasMode && (current.dmDisplayFlags & 0x2) != 0
            };
            if (activeMode.refreshRate <= 1 && descriptor != null) activeMode.refreshRate = 60;
            int scale;
            if (!scales.TryGetValue(adapter.DeviceName, out scale)) scale = 100;
            List<int> availableScales;
            if (!scaleOptions.TryGetValue(adapter.DeviceName, out availableScales)) availableScales = new List<int> { scale };

            result.Add(new DisplayDto
            {
                id = stableId,
                systemId = adapter.DeviceName,
                name = friendly.Trim(),
                adapterName = adapter.DeviceString,
                connection = descriptor != null ? descriptor.Connection : "Unknown",
                enabled = enabled,
                mirrored = descriptor != null && descriptor.Mirrored,
                primary = (adapter.StateFlags & DISPLAY_DEVICE_PRIMARY_DEVICE) != 0,
                hdrSupported = descriptor != null && descriptor.HdrSupported,
                hdrEnabled = descriptor != null && descriptor.HdrEnabled,
                bounds = new BoundsDto { x = hasMode ? current.dmPosition.x : 0, y = hasMode ? current.dmPosition.y : 0, width = activeMode.width, height = activeMode.height },
                mode = activeMode,
                rotation = OrientationToRotation(hasMode ? current.dmDisplayOrientation : 0),
                scalePercent = scale,
                availableScalePercents = availableScales,
                availableModes = modes
            });
        }
        foreach (IGrouping<string, CcdDescriptor> targetGroup in ccd
            .Where(d => !String.IsNullOrWhiteSpace(d.DevicePath) && d.TargetAvailable)
            .GroupBy(d => BuildStableId(d.DevicePath, d.GdiName), StringComparer.OrdinalIgnoreCase))
        {
            CcdDescriptor descriptor = targetGroup.OrderByDescending(d => d.Active).ThenByDescending(d => d.TargetAvailable).First();
            DisplayDto existingTarget = result.FirstOrDefault(d => EqualId(d.id, targetGroup.Key));
            if (existingTarget != null && (existingTarget.enabled || !descriptor.Active)) continue;
            if (existingTarget != null) result.Remove(existingTarget);
            DEVMODE current = CreateDevMode();
            bool hasMode = descriptor.Active && EnumDisplaySettingsEx(descriptor.GdiName, ENUM_CURRENT_SETTINGS, ref current, 0);
            if (!hasMode && descriptor.Active) hasMode = EnumDisplaySettingsEx(descriptor.GdiName, ENUM_REGISTRY_SETTINGS, ref current, 0);
            ModeDto activeMode = new ModeDto
            {
                width = hasMode ? (int)current.dmPelsWidth : 0,
                height = hasMode ? (int)current.dmPelsHeight : 0,
                refreshRate = hasMode ? current.dmDisplayFrequency : 0,
                bitDepth = hasMode ? (int)current.dmBitsPerPel : 0,
                interlaced = hasMode && (current.dmDisplayFlags & 0x2) != 0
            };
            int scale;
            if (!scales.TryGetValue(descriptor.GdiName, out scale)) scale = 100;
            List<int> availableScales;
            if (!scaleOptions.TryGetValue(descriptor.GdiName, out availableScales)) availableScales = new List<int> { scale };
            result.Add(new DisplayDto
            {
                id = targetGroup.Key,
                systemId = descriptor.GdiName,
                name = String.IsNullOrWhiteSpace(descriptor.FriendlyName) ? "Inactive display" : descriptor.FriendlyName.Trim(),
                adapterName = "",
                connection = descriptor.Connection,
                enabled = descriptor.Active && hasMode,
                mirrored = descriptor.Active && descriptor.Mirrored,
                primary = false,
                hdrSupported = descriptor.Active && descriptor.HdrSupported,
                hdrEnabled = descriptor.Active && descriptor.HdrEnabled,
                bounds = new BoundsDto { x = hasMode ? current.dmPosition.x : 0, y = hasMode ? current.dmPosition.y : 0, width = activeMode.width, height = activeMode.height },
                mode = activeMode,
                rotation = OrientationToRotation(hasMode ? current.dmDisplayOrientation : 0),
                scalePercent = scale,
                availableScalePercents = descriptor.Active ? availableScales : new List<int>(),
                availableModes = descriptor.Active ? EnumerateModes(descriptor.GdiName) : new List<ModeDto>()
            });
        }
        result = result
            .GroupBy(d => d.id, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.OrderByDescending(d => d.enabled).ThenByDescending(d => d.primary).First())
            .ToList();
        if (!result.Any(d => d.enabled && d.primary))
        {
            DisplayDto inferredPrimary = result.FirstOrDefault(d => d.enabled && d.bounds.x == 0 && d.bounds.y == 0) ?? result.FirstOrDefault(d => d.enabled);
            if (inferredPrimary != null) inferredPrimary.primary = true;
        }
        return result.OrderByDescending(d => d.primary).ThenBy(d => d.bounds.x).ThenBy(d => d.bounds.y).ToList();
    }

    private static List<ModeDto> EnumerateModes(string deviceName)
    {
        Dictionary<string, ModeDto> modes = new Dictionary<string, ModeDto>();
        for (int index = 0; index < 4096; index++)
        {
            DEVMODE mode = CreateDevMode();
            if (!EnumDisplaySettingsEx(deviceName, index, ref mode, 0)) break;
            if (mode.dmPelsWidth < 640 || mode.dmPelsHeight < 480 || mode.dmDisplayFrequency < 23 || mode.dmBitsPerPel < 24) continue;
            bool interlaced = (mode.dmDisplayFlags & 0x2) != 0;
            string key = mode.dmPelsWidth + "x" + mode.dmPelsHeight + "@" + mode.dmDisplayFrequency + (interlaced ? "i" : "p");
            if (!modes.ContainsKey(key)) modes[key] = new ModeDto { width = (int)mode.dmPelsWidth, height = (int)mode.dmPelsHeight, refreshRate = mode.dmDisplayFrequency, bitDepth = (int)mode.dmBitsPerPel, interlaced = interlaced };
        }
        return modes.Values.OrderByDescending(m => m.width * m.height).ThenByDescending(m => m.refreshRate).ThenBy(m => m.interlaced).ToList();
    }

    private static List<CcdDescriptor> GetCcdDescriptors()
    {
        List<CcdDescriptor> result = new List<CcdDescriptor>();
        uint pathCount, modeCount;
        if (GetDisplayConfigBufferSizes(QDC_ALL_PATHS, out pathCount, out modeCount) != ERROR_SUCCESS || pathCount == 0) return result;
        DISPLAYCONFIG_PATH_INFO[] paths = new DISPLAYCONFIG_PATH_INFO[pathCount];
        DISPLAYCONFIG_MODE_INFO[] modes = new DISPLAYCONFIG_MODE_INFO[Math.Max(1, modeCount)];
        if (QueryDisplayConfig(QDC_ALL_PATHS, ref pathCount, paths, ref modeCount, modes, IntPtr.Zero) != ERROR_SUCCESS) return result;
        for (int index = 0; index < pathCount; index++)
        {
            DISPLAYCONFIG_PATH_INFO path = paths[index];
            DISPLAYCONFIG_SOURCE_DEVICE_NAME source = new DISPLAYCONFIG_SOURCE_DEVICE_NAME();
            source.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME;
            source.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SOURCE_DEVICE_NAME));
            source.header.adapterId = path.sourceInfo.adapterId;
            source.header.id = path.sourceInfo.id;
            if (DisplayConfigGetSourceName(ref source) != ERROR_SUCCESS || String.IsNullOrWhiteSpace(source.viewGdiDeviceName)) continue;

            DISPLAYCONFIG_TARGET_DEVICE_NAME target = new DISPLAYCONFIG_TARGET_DEVICE_NAME();
            target.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME;
            target.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_TARGET_DEVICE_NAME));
            target.header.adapterId = path.targetInfo.adapterId;
            target.header.id = path.targetInfo.id;
            DisplayConfigGetTargetName(ref target);

            CcdDescriptor descriptor = new CcdDescriptor
            {
                GdiName = source.viewGdiDeviceName,
                FriendlyName = target.monitorFriendlyDeviceName,
                DevicePath = target.monitorDevicePath,
                Connection = ConnectionName(path.targetInfo.outputTechnology),
                Active = (path.flags & DISPLAYCONFIG_PATH_ACTIVE) != 0,
                TargetAvailable = path.targetInfo.targetAvailable,
                SourceKey = SourceKey(path),
                AdapterId = path.targetInfo.adapterId,
                TargetId = path.targetInfo.id
            };
            if (descriptor.Active)
            {
                DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO color = new DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO();
                color.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_ADVANCED_COLOR_INFO;
                color.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO));
                color.header.adapterId = path.targetInfo.adapterId;
                color.header.id = path.targetInfo.id;
                if (DisplayConfigGetAdvancedColorInfo(ref color) == ERROR_SUCCESS)
                {
                    descriptor.HdrSupported = (color.value & 0x1) != 0;
                    descriptor.HdrEnabled = (color.value & 0x2) != 0;
                }
            }
            result.Add(descriptor);
        }
        foreach (IGrouping<string, CcdDescriptor> sourceGroup in result.Where(d => d.Active).GroupBy(d => d.SourceKey, StringComparer.OrdinalIgnoreCase))
        {
            if (sourceGroup.Count() < 2) continue;
            foreach (CcdDescriptor descriptor in sourceGroup) descriptor.Mirrored = true;
        }
        return result;
    }

    private static Dictionary<string, List<int>> GetDpiScaleOptions(Dictionary<string, int> currentScales)
    {
        Dictionary<string, List<int>> result = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
        DISPLAYCONFIG_PATH_INFO[] paths;
        DISPLAYCONFIG_MODE_INFO[] modes;
        string error;
        if (!QueryCcd(QDC_ONLY_ACTIVE_PATHS, out paths, out modes, out error)) return result;
        foreach (DISPLAYCONFIG_PATH_INFO path in paths)
        {
            DISPLAYCONFIG_SOURCE_DEVICE_NAME source = GetSourceName(path);
            if (String.IsNullOrWhiteSpace(source.viewGdiDeviceName)) continue;
            int currentScale;
            if (!currentScales.TryGetValue(source.viewGdiDeviceName, out currentScale)) currentScale = 100;
            DISPLAYCONFIG_SOURCE_DPI_SCALE_GET packet;
            if (!TryGetDpiScale(path, out packet))
            {
                result[source.viewGdiDeviceName] = new List<int> { currentScale };
                continue;
            }
            int currentIndex = Array.IndexOf(DpiScaleValues, currentScale);
            if (currentIndex < 0)
            {
                result[source.viewGdiDeviceName] = new List<int> { currentScale };
                continue;
            }
            int recommendedIndex = currentIndex - packet.curScaleRel;
            int first = Math.Max(0, recommendedIndex + packet.minScaleRel);
            int last = Math.Min(DpiScaleValues.Length - 1, recommendedIndex + packet.maxScaleRel);
            List<int> choices = new List<int>();
            for (int index = first; index <= last; index++) choices.Add(DpiScaleValues[index]);
            if (!choices.Contains(currentScale)) choices.Add(currentScale);
            result[source.viewGdiDeviceName] = choices.Distinct().OrderBy(value => value).ToList();
        }
        return result;
    }

    private static bool TryGetDpiScale(DISPLAYCONFIG_PATH_INFO path, out DISPLAYCONFIG_SOURCE_DPI_SCALE_GET packet)
    {
        packet = new DISPLAYCONFIG_SOURCE_DPI_SCALE_GET();
        packet.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_DPI_SCALE;
        packet.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SOURCE_DPI_SCALE_GET));
        packet.header.adapterId = path.sourceInfo.adapterId;
        packet.header.id = path.sourceInfo.id;
        return DisplayConfigGetDpiScale(ref packet) == ERROR_SUCCESS;
    }

    private static void ApplyDpiScales(ProfileDto profile, List<string> warnings)
    {
        DISPLAYCONFIG_PATH_INFO[] paths;
        DISPLAYCONFIG_MODE_INFO[] modes;
        string queryError;
        if (!QueryCcd(QDC_ONLY_ACTIVE_PATHS, out paths, out modes, out queryError))
        {
            warnings.Add("Windows desktop scaling could not be queried: " + queryError);
            return;
        }
        Dictionary<string, int> currentScales = GetDpiScales();
        foreach (DISPLAYCONFIG_PATH_INFO path in paths)
        {
            DISPLAYCONFIG_SOURCE_DEVICE_NAME source = GetSourceName(path);
            DISPLAYCONFIG_TARGET_DEVICE_NAME target = GetTargetName(path);
            string stableId = BuildStableId(target.monitorDevicePath, source.viewGdiDeviceName);
            ProfileDisplayDto desired = FindDesiredDisplay(profile.displays, stableId, source.viewGdiDeviceName, true);
            if (desired == null || desired.scalePercent <= 0) continue;
            int currentScale;
            if (!currentScales.TryGetValue(source.viewGdiDeviceName, out currentScale)) currentScale = 100;
            if (currentScale == desired.scalePercent) continue;

            DISPLAYCONFIG_SOURCE_DPI_SCALE_GET currentPacket;
            if (!TryGetDpiScale(path, out currentPacket))
            {
                warnings.Add(desired.name + ": Windows did not expose desktop scaling control for this display.");
                continue;
            }
            int currentIndex = Array.IndexOf(DpiScaleValues, currentScale);
            int desiredIndex = Array.IndexOf(DpiScaleValues, desired.scalePercent);
            if (currentIndex < 0 || desiredIndex < 0)
            {
                warnings.Add(desired.name + ": " + desired.scalePercent + "% is not a standard Windows scaling value.");
                continue;
            }
            int recommendedIndex = currentIndex - currentPacket.curScaleRel;
            int relative = desiredIndex - recommendedIndex;
            if (relative < currentPacket.minScaleRel || relative > currentPacket.maxScaleRel)
            {
                warnings.Add(desired.name + ": " + desired.scalePercent + "% is outside the scaling range reported by Windows.");
                continue;
            }

            DISPLAYCONFIG_SOURCE_DPI_SCALE_SET setPacket = new DISPLAYCONFIG_SOURCE_DPI_SCALE_SET();
            setPacket.header.type = DISPLAYCONFIG_DEVICE_INFO_SET_DPI_SCALE;
            setPacket.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SOURCE_DPI_SCALE_SET));
            setPacket.header.adapterId = path.sourceInfo.adapterId;
            setPacket.header.id = path.sourceInfo.id;
            setPacket.scaleRel = relative;
            int setResult = DisplayConfigSetDpiScale(ref setPacket);
            if (setResult != ERROR_SUCCESS) warnings.Add(desired.name + ": Windows rejected the scaling change (error " + setResult + ").");
        }
    }

    private static Dictionary<string, int> GetDpiScales()
    {
        Dictionary<string, int> result = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        try
        {
            try { SetProcessDpiAwareness(2); } catch { }
            MonitorEnumProc callback = delegate(IntPtr handle, IntPtr hdc, ref RECT rect, IntPtr data)
            {
                MONITORINFOEX info = new MONITORINFOEX();
                info.cbSize = (uint)Marshal.SizeOf(typeof(MONITORINFOEX));
                if (GetMonitorInfo(handle, ref info))
                {
                    uint dpiX, dpiY;
                    if (GetDpiForMonitor(handle, 0, out dpiX, out dpiY) == 0) result[info.szDevice] = (int)Math.Round(dpiX / 96.0 * 100.0);
                }
                return true;
            };
            EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, callback, IntPtr.Zero);
        }
        catch { }
        return result;
    }

    private static bool SetHdr(CcdDescriptor descriptor, bool enabled, out string error)
    {
        DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE state = new DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE();
        state.header.type = DISPLAYCONFIG_DEVICE_INFO_SET_ADVANCED_COLOR_STATE;
        state.header.size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SET_ADVANCED_COLOR_STATE));
        state.header.adapterId = descriptor.AdapterId;
        state.header.id = descriptor.TargetId;
        state.enableAdvancedColor = enabled;
        int result = DisplayConfigSetAdvancedColorState(ref state);
        error = result == ERROR_SUCCESS ? null : "Windows rejected the HDR change (error " + result + ").";
        return result == ERROR_SUCCESS;
    }

    private static DISPLAY_DEVICE CreateDisplayDevice()
    {
        DISPLAY_DEVICE value = new DISPLAY_DEVICE();
        value.cb = Marshal.SizeOf(typeof(DISPLAY_DEVICE));
        return value;
    }

    private static DEVMODE CreateDevMode()
    {
        DEVMODE value = new DEVMODE();
        value.dmDeviceName = new string('\0', 32);
        value.dmFormName = new string('\0', 32);
        value.dmSize = (ushort)Marshal.SizeOf(typeof(DEVMODE));
        return value;
    }

    private static string BuildStableId(string devicePath, string fallback)
    {
        string basis = String.IsNullOrWhiteSpace(devicePath) ? fallback : devicePath;
        return "win:" + (basis ?? "unknown").Trim().ToLowerInvariant();
    }

    private static bool EqualId(string left, string right) { return String.Equals(left ?? "", right ?? "", StringComparison.OrdinalIgnoreCase); }
    private static int OrientationToRotation(uint orientation) { return orientation == 1 ? 90 : orientation == 2 ? 180 : orientation == 3 ? 270 : 0; }
    private static uint RotationToOrientation(int rotation) { return rotation == 90 ? 1u : rotation == 180 ? 2u : rotation == 270 ? 3u : 0u; }
    private static uint RotationToCcd(int rotation) { return rotation == 90 ? 2u : rotation == 180 ? 3u : rotation == 270 ? 4u : 1u; }

    private static string ConnectionName(uint technology)
    {
        if (technology == 5) return "HDMI";
        if (technology == 10 || technology == 11 || technology == 12 || technology == 13) return "DisplayPort";
        if (technology == 4) return "DVI";
        if (technology == 0) return "VGA";
        if (technology == 6 || technology == 0x80000000) return "Internal";
        if (technology == 15 || technology == 17) return "Virtual";
        return "Unknown";
    }

    private static string Fail(string message)
    {
        return Serializer.Serialize(new ResponseDto { ok = false, message = message, warnings = new List<string>(), data = new List<DisplayDto>() });
    }
}
'@

try {
  Add-Type -TypeDefinition $nativeSource -Language CSharp -ReferencedAssemblies @('System.Web.Extensions')
  $payloadJson = if ($PayloadBase64) { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PayloadBase64)) } else { '' }
  switch ($Command) {
    'list'  { [MonitorManagerNative]::ListJson() }
    'apply' { [MonitorManagerNative]::ApplyJson($payloadJson) }
    'hdr'   { [MonitorManagerNative]::SetHdrJson($payloadJson) }
    'debug' { [MonitorManagerNative]::DebugCcdJson() }
    'debugall' { [MonitorManagerNative]::DebugAllCcdJson() }
  }
}
catch {
  $safeMessage = $_.Exception.Message | ConvertTo-Json -Compress
  "{`"ok`":false,`"message`":$safeMessage,`"warnings`":[],`"data`":[]}"
}
