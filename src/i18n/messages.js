/**
 * Every string the reader sees, in the three languages the app speaks.
 *
 * Two rules hold throughout:
 *
 *   - No sentence is assembled from fragments. Word order is not a constant
 *     across these three languages — "Updated 5 minutes ago" puts the verb
 *     first, "5 分前に更新" puts it last — so anything with a moving part is a
 *     whole template with a {placeholder} in it, and each language decides
 *     where the placeholder goes.
 *
 *   - Nothing here names a model, a provider, or an API parameter. The reader
 *     is told what the number means and how far it is to be trusted, which is
 *     the entire question they arrived with.
 */
export const MESSAGES = {
  en: {
    // A product name, not a word — it stays put in every language, the way
    // any other brand does. The line under it is what gets translated.
    app: { name: 'BestCast', tagline: 'A forecast, and how sure it is' },

    header: {
      forecastFor: 'Forecast for',
      choosePlace: 'Choose a place',
      update: 'Update',
      updating: 'Updating',
      updateAria: 'Get the latest forecast',
    },

    lang: { label: 'Language', aria: 'Choose a language' },

    location: {
      title: 'Location',
      useMyLocation: 'Use my location',
      finding: 'Finding you…',
      searchLabel: 'Search for a town or city',
      searchPlaceholder: 'For example: Hanoi',
      search: 'Search',
      searching: 'Searching…',
      noResults: 'Nothing matched “{query}”. Try a larger town nearby.',
      searchFailed: 'We could not search just now. Check your connection and try again.',
      mapHint: 'Tap the map to move the pin, or search above.',
      noPlaceHint: 'Search for your town, or tap the map to pick a spot.',
      findingName: 'Finding the name…',
      unnamed: 'Selected point',
      unsupported: 'This browser cannot use your location. Please search for your town instead.',
      errorTitle: 'We could not find you',
      close: 'Close',
      gps: {
        denied: 'This app does not have permission to see your location. You can turn it on in your device settings, or search for your town instead.',
        unavailable: 'Your device could not work out where it is. Try again near a window, or search for your town instead.',
        timeout: 'Finding your location took too long. Please try again.',
        failed: 'We could not find your location. Try searching for your town instead.',
        unreadable: 'Your device reported a location we could not read.',
      },
    },

    status: {
      offline: 'No internet. Showing the last forecast we saved.',
      offlineAge: 'No internet. Showing what we saved — {age}.',
      error: 'Could not reach the weather service. {age}',
      errorNoAge: 'Could not reach the weather service. Showing a saved forecast.',
      stale: '{age}. Press Update for the latest.',
      tryAgain: 'Try again',
    },

    time: {
      updated: 'Updated {rel}',
      justNow: 'Updated just now',
    },

    params: {
      precipitation: { name: 'Rainfall', daily: 'Total for the day', hourly: 'Falling in each hour' },
      precipitationProbability: { name: 'Chance of rain', daily: 'Highest chance during the day', hourly: 'Chance in each hour' },
      temperature: { name: 'Temperature', daily: 'Daytime high and overnight low', hourly: 'At each hour' },
      wind: { name: 'Wind speed', daily: 'Fastest expected during the day', hourly: 'At each hour' },
    },

    chart: {
      daily: 'Day by day',
      dailyHint: 'A week behind, a week ahead. Today is marked.',
      hourly: 'Hour by hour',
      hourlyHint: 'The next {days} days. Swipe sideways to see them all.',
      today: 'Today',
      tomorrow: 'Tomorrow',
      nowMark: 'now',
      todayMark: 'today',
      high: 'High',
      low: 'Low',
      ariaDaily: '{param}, day by day. {summary}',
      ariaHourly: '{param}, hour by hour for {days} days. {summary}',
    },


    errors: {
      offline: 'No internet connection. Check your signal and try again.',
      service: 'The weather service could not be reached just now.',
      unreadable: 'The weather service sent a reply we could not read.',
    },

    states: {
      loading: 'Getting the forecast…',
      errorTitle: 'We could not get the forecast',
      errorBody: 'Something went wrong. Please try again.',
      retry: 'Try again',
      noData: 'No forecast is available for this place.',
      noPlace: 'Pick a place to see its forecast.',
    },

    table: {
      show: 'Show as a table',
      hide: 'Show as a chart',
      date: 'Date',
      time: 'Time',
      likely: 'Most likely',
      high: 'High',
      low: 'Low',
    },

    settings: {
      title: 'Settings',
      units: 'Units',
      textSize: 'Text size',
      textNormal: 'Normal',
      textLarge: 'Large',
      textLargest: 'Largest',
    },

    about: {
      title: 'About',
      body: 'This forecast is built from several independent weather services at once, combined into the single most likely outcome for each day and each hour. A forecast is an estimate: the further ahead it reaches, the more it should be read as a guide rather than a promise.',
      credits: 'Weather data by Open-Meteo. Map by OpenStreetMap.',
    },

    author: { title: 'Author', rights: 'All rights reserved.' },
  },

  vi: {
    app: { name: 'BestCast', tagline: 'Dự báo, và mức độ chắc chắn' },

    header: {
      forecastFor: 'Dự báo cho',
      choosePlace: 'Chọn một địa điểm',
      update: 'Cập nhật',
      updating: 'Đang cập nhật',
      updateAria: 'Lấy dự báo mới nhất',
    },

    lang: { label: 'Ngôn ngữ', aria: 'Chọn ngôn ngữ' },

    location: {
      title: 'Địa điểm',
      useMyLocation: 'Dùng vị trí của tôi',
      finding: 'Đang tìm vị trí…',
      searchLabel: 'Tìm tỉnh hoặc thành phố',
      searchPlaceholder: 'Ví dụ: Hà Nội',
      search: 'Tìm kiếm',
      searching: 'Đang tìm…',
      noResults: 'Không có kết quả nào cho “{query}”. Hãy thử tên một thành phố lớn gần đó.',
      searchFailed: 'Hiện chưa tìm được. Vui lòng kiểm tra kết nối và thử lại.',
      mapHint: 'Chạm vào bản đồ để di chuyển ghim, hoặc tìm kiếm ở trên.',
      noPlaceHint: 'Hãy tìm thành phố của bạn, hoặc chạm vào bản đồ để chọn một điểm.',
      findingName: 'Đang tìm tên địa điểm…',
      unnamed: 'Điểm đã chọn',
      unsupported: 'Trình duyệt này không dùng được vị trí. Vui lòng tìm theo tên thành phố.',
      errorTitle: 'Không tìm được vị trí của bạn',
      close: 'Đóng',
      gps: {
        denied: 'Ứng dụng chưa được cấp quyền truy cập vị trí. Bạn có thể bật trong cài đặt thiết bị, hoặc tìm theo tên thành phố.',
        unavailable: 'Thiết bị không xác định được vị trí. Hãy thử lại gần cửa sổ, hoặc tìm theo tên thành phố.',
        timeout: 'Việc xác định vị trí mất quá nhiều thời gian. Vui lòng thử lại.',
        failed: 'Không tìm được vị trí của bạn. Hãy thử tìm theo tên thành phố.',
        unreadable: 'Thiết bị báo về một vị trí không đọc được.',
      },
    },

    status: {
      offline: 'Không có kết nối. Đang hiển thị dự báo đã lưu gần nhất.',
      offlineAge: 'Không có kết nối. Đang hiển thị bản đã lưu — {age}.',
      error: 'Không kết nối được dịch vụ thời tiết. {age}',
      errorNoAge: 'Không kết nối được dịch vụ thời tiết. Đang hiển thị bản đã lưu.',
      stale: '{age}. Nhấn Cập nhật để lấy bản mới nhất.',
      tryAgain: 'Thử lại',
    },

    time: {
      updated: 'Cập nhật {rel}',
      justNow: 'Vừa cập nhật',
    },

    params: {
      precipitation: { name: 'Lượng mưa', daily: 'Tổng lượng trong ngày', hourly: 'Lượng mưa mỗi giờ' },
      precipitationProbability: { name: 'Khả năng mưa', daily: 'Khả năng cao nhất trong ngày', hourly: 'Khả năng trong mỗi giờ' },
      temperature: { name: 'Nhiệt độ', daily: 'Cao nhất ban ngày và thấp nhất ban đêm', hourly: 'Nhiệt độ mỗi giờ' },
      wind: { name: 'Tốc độ gió', daily: 'Mức cao nhất trong ngày', hourly: 'Tốc độ mỗi giờ' },
    },

    chart: {
      daily: 'Theo ngày',
      dailyHint: 'Một tuần trước và một tuần tới. Hôm nay được đánh dấu.',
      hourly: 'Theo giờ',
      hourlyHint: '{days} ngày tới. Vuốt ngang để xem hết.',
      today: 'Hôm nay',
      tomorrow: 'Ngày mai',
      nowMark: 'bây giờ',
      todayMark: 'hôm nay',
      high: 'Cao nhất',
      low: 'Thấp nhất',
      ariaDaily: '{param}, theo từng ngày. {summary}',
      ariaHourly: '{param}, theo từng giờ trong {days} ngày. {summary}',
    },


    errors: {
      offline: 'Không có kết nối internet. Hãy kiểm tra sóng và thử lại.',
      service: 'Hiện chưa kết nối được dịch vụ thời tiết.',
      unreadable: 'Dịch vụ thời tiết gửi về dữ liệu không đọc được.',
    },

    states: {
      loading: 'Đang lấy dự báo…',
      errorTitle: 'Không lấy được dự báo',
      errorBody: 'Đã xảy ra lỗi. Vui lòng thử lại.',
      retry: 'Thử lại',
      noData: 'Không có dự báo cho địa điểm này.',
      noPlace: 'Hãy chọn một địa điểm để xem dự báo.',
    },

    table: {
      show: 'Xem dạng bảng',
      hide: 'Xem dạng biểu đồ',
      date: 'Ngày',
      time: 'Thời gian',
      likely: 'Khả năng cao nhất',
      high: 'Cao nhất',
      low: 'Thấp nhất',
    },

    settings: {
      title: 'Cài đặt',
      units: 'Đơn vị',
      textSize: 'Cỡ chữ',
      textNormal: 'Bình thường',
      textLarge: 'Lớn',
      textLargest: 'Lớn nhất',
    },

    about: {
      title: 'Giới thiệu',
      body: 'Dự báo này được tổng hợp cùng lúc từ nhiều dịch vụ thời tiết độc lập thành một kết quả có khả năng cao nhất cho từng ngày và từng giờ. Dự báo chỉ là ước lượng: càng xa thì càng nên xem như tham khảo chứ không phải điều chắc chắn.',
      credits: 'Dữ liệu thời tiết từ Open-Meteo. Bản đồ từ OpenStreetMap.',
    },

    author: { title: 'Tác giả', rights: 'Bảo lưu mọi quyền.' },
  },

  ja: {
    app: { name: 'BestCast', tagline: '予報と、その確かさ' },

    header: {
      forecastFor: '予報地点',
      choosePlace: '地点を選択',
      update: '更新',
      updating: '更新中',
      updateAria: '最新の予報を取得',
    },

    lang: { label: '言語', aria: '言語を選択' },

    location: {
      title: '地点',
      useMyLocation: '現在地を使う',
      finding: '現在地を取得中…',
      searchLabel: '市区町村を検索',
      searchPlaceholder: '例：東京',
      search: '検索',
      searching: '検索中…',
      noResults: '「{query}」に一致する地点がありません。近くの大きな都市名でお試しください。',
      searchFailed: '現在検索できません。通信状態を確認して、もう一度お試しください。',
      mapHint: '地図をタップするとピンを移動できます。上の検索窓もご利用いただけます。',
      noPlaceHint: '市区町村を検索するか、地図をタップして地点を選んでください。',
      findingName: '地名を取得中…',
      unnamed: '選択した地点',
      unsupported: 'このブラウザでは現在地を利用できません。市区町村名で検索してください。',
      errorTitle: '現在地を取得できませんでした',
      close: '閉じる',
      gps: {
        denied: '位置情報の利用が許可されていません。端末の設定で許可するか、市区町村名で検索してください。',
        unavailable: '端末が現在地を特定できませんでした。窓の近くでもう一度お試しいただくか、市区町村名で検索してください。',
        timeout: '現在地の取得に時間がかかりすぎました。もう一度お試しください。',
        failed: '現在地を取得できませんでした。市区町村名で検索してみてください。',
        unreadable: '端末から読み取れない位置情報が返されました。',
      },
    },

    status: {
      offline: 'インターネットに接続していません。保存済みの最新予報を表示しています。',
      offlineAge: 'インターネットに接続していません。保存済みの予報を表示しています（{age}）。',
      error: '気象サービスに接続できませんでした。{age}',
      errorNoAge: '気象サービスに接続できませんでした。保存済みの予報を表示しています。',
      stale: '{age}。最新の予報は「更新」を押してください。',
      tryAgain: '再試行',
    },

    time: {
      updated: '{rel}に更新',
      justNow: 'たった今更新',
    },

    params: {
      precipitation: { name: '降水量', daily: '1日の合計', hourly: '1時間ごとの降水量' },
      precipitationProbability: { name: '降水確率', daily: '日中の最大確率', hourly: '1時間ごとの確率' },
      temperature: { name: '気温', daily: '日中の最高気温と夜間の最低気温', hourly: '1時間ごとの気温' },
      wind: { name: '風速', daily: '1日の最大風速', hourly: '1時間ごとの風速' },
    },

    chart: {
      daily: '日別',
      dailyHint: '過去1週間と今後1週間。今日に印がついています。',
      hourly: '時間別',
      hourlyHint: '今後{days}日間。横にスワイプするとすべて見られます。',
      today: '今日',
      tomorrow: '明日',
      nowMark: '現在',
      todayMark: '今日',
      high: '最高',
      low: '最低',
      ariaDaily: '{param}の日別グラフ。{summary}',
      ariaHourly: '{param}の{days}日間の時間別グラフ。{summary}',
    },


    errors: {
      offline: 'インターネットに接続していません。電波状況を確認して、もう一度お試しください。',
      service: '現在、気象サービスに接続できません。',
      unreadable: '気象サービスから読み取れないデータが返されました。',
    },

    states: {
      loading: '予報を取得中…',
      errorTitle: '予報を取得できませんでした',
      errorBody: '問題が発生しました。もう一度お試しください。',
      retry: '再試行',
      noData: 'この地点の予報はありません。',
      noPlace: '地点を選ぶと予報が表示されます。',
    },

    table: {
      show: '表で見る',
      hide: 'グラフで見る',
      date: '日付',
      time: '時刻',
      likely: '最も可能性が高い',
      high: '最高',
      low: '最低',
    },

    settings: {
      title: '設定',
      units: '単位',
      textSize: '文字サイズ',
      textNormal: '標準',
      textLarge: '大',
      textLargest: '最大',
    },

    about: {
      title: 'このアプリについて',
      body: 'この予報は、複数の独立した気象サービスをまとめ、日ごと・時間ごとに最も可能性の高い値として作成しています。予報はあくまで推定であり、先の日付になるほど確定した予報ではなく目安としてご覧ください。',
      credits: '気象データ：Open-Meteo。地図：OpenStreetMap。',
    },

    author: { title: '作成者', rights: 'All rights reserved.' },
  },
}
