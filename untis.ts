// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: graduation-cap;

/*
Untis Widget by JFK-05

A widget used to display information from Untis.
This includes upcoming lessons, exams and grades.
*/

const CURRENT_DATETIME = new Date() // '2022-09-15T14:00' or '2022-09-19T12:30'

//#region Constants

const LOCALE = Device.locale().replace('_', '-')
const PREVIEW_WIDGET_SIZE: typeof config.widgetFamily = 'small'
const MAX_TIME_STRING = '10:00'
const MAX_SUBJECT_NAME_LENGTH = 6
const MAX_LONG_SUBJECT_NAME_LENGTH = 12
const NO_VALUE_PLACEHOLDERS = ['---']
const NOTIFIABLE_TOPICS = ['lessons', 'exams', 'grades', 'absences']
// the layout is a list of views separated by commas, the columns are separated by pipes "|"
const defaultLayout = 'lessons,exams'

let usingOldCache = false

//#endregion

//#region Types

//#region Transformed

/**
 * An element that does not have a state and can therefore not be substituted.
 */
interface TransformedStatelessElement {
	id: number
	name: string
}

interface ExtendedTransformedElement extends TransformedStatelessElement {
	longName: string
}

interface Teacher extends TransformedStatelessElement {}
interface Group extends ExtendedTransformedElement {}
interface Subject extends ExtendedTransformedElement {}
interface Room extends ExtendedTransformedElement {
	capacity: number
}

type StatelessElement = Teacher | Group | Subject | Room

type StatefulElement = Stateful<StatelessElement>

/**
 * An element that has a state and can therefore be substituted.
 */
type Stateful<T extends StatelessElement> = T & {
	state: ElementState
	original?: T
}

interface TransformedLesson {
	id: number
	note?: string // lessonText
	text?: string // periodText
	info?: string // periodInfo
	substitutionText?: string

	from: Date // date + startTime
	to: Date // date + endTime

	groups: Stateful<Group>[]
	subject?: Stateful<Subject>
	teachers: Stateful<Teacher>[]
	rooms: Stateful<Room>[]

	state: LessonState // cellState
	isEvent: boolean // is.event

	exam?: {
		name: string
		markSchemaId: number
	}

	isRescheduled: boolean
	rescheduleInfo?: {
		isSource: boolean
		otherFrom: Date
		otherTo: Date
	}

	break?: number
	duration: number
	backgroundColor?: string
}

interface TransformedLessonWeek {
	[key: string]: TransformedLesson[]
}

/**
 * The id would always be 0.
 */
interface TransformedExam {
	// id: number
	type: string
	name: string
	from: Date
	to: Date
	subject: string
	teacherNames: string[]
	roomNames: string[]
	// text: string
}

interface TransformedGrade {
	subject: string
	date: Date
	lastUpdated: Date
	text: string
	schemaId: number

	mark: {
		displayValue: number
		name: string
		id: number
	}

	examType: {
		name: string
		longName: string
	}

	exam?: {
		name: string
		id: number
		date: Date
	}
}

interface TransformedAbsence {
	from: Date
	to: Date
	createdBy: string
	reasonId: number
	isExcused: boolean
	excusedBy?: string
}

interface TransformedClassRole {
	fromDate: Date
	toDate: Date
	firstName: string
	lastName: string
	dutyName: string
}

interface TransformedSchoolYear {
	id: number
	name: string
	from: Date
	to: Date
}

//#endregion

//#region Untis

enum ElementType {
	GROUP = 1,
	TEACHER = 2,
	SUBJECT = 3,
	ROOM = 4,
}

type Element = ElementGroup | ElementTeacher | ElementSubject | ElementRoom

interface UnresolvedElement {
	type: ElementType
	id: number
	orgId: number
	missing: boolean
	state: ElementState
}
interface ElementBase {
	type: number
	id: number
	name: string
	canViewTimetable: boolean
	roomCapacity: number
}

interface ElementExtended extends ElementBase {
	longName: string
	displayName: string
	alternatename: string
}

interface ElementGroup extends ElementExtended {
	type: 1
}

interface ElementTeacher extends ElementBase {
	type: 2
	externKey: string
}

interface ElementSubject extends ElementExtended {
	type: 3
}

interface ElementRoom extends ElementExtended {
	type: 4
}

enum LessonState {
	NORMAL = 'STANDARD',
	FREE = 'FREE',
	CANCELED = 'CANCEL',
	EXAM = 'EXAM',
	RESCHEDULED = 'SHIFT',
	SUBSTITUTED = 'SUBSTITUTION',
	ROOM_SUBSTITUTED = 'ROOMSUBSTITUTION',
	TEACHER_SUBSTITUTED = 'TEACHERSUBSTITUTION',
	ADDITIONAL = 'ADDITIONAL',
}

enum ElementState {
	REGULAR = 'REGULAR',
	SUBSTITUTED = 'SUBSTITUTED',
	ABSENT = 'ABSENT',
}

interface Lesson {
	id: number
	lessonId: number
	lessonNumber: number
	lessonCode: 'UNTIS_ADDITIONAL' | 'LESSON'
	lessonText: string

	hasPeriodText: boolean
	periodText: string
	periodInfo: string
	periodAttachments: any[]
	substText: string

	date: number
	startTime: number
	endTime: number

	elements: UnresolvedElement[]

	hasInfo: boolean
	code: number // known: 0, 12, 120, 124
	cellState: LessonState
	priority: number // known: 1, 3, 5, 8
	is: {
		standard?: boolean
		free?: boolean
		additional?: boolean
		cancelled?: boolean
		shift?: boolean
		substitution?: boolean
		exam?: boolean
		event: boolean
	}

	roomCapacity: number
	studentGroup: string
	studentCount: number

	exam?: {
		markSchemaId: number // 1 = grade, 2 = ?, 3 = +/- etc.
		date: number
		name: string
		id: number
	}

	rescheduleInfo?: {
		date: number
		startTime: number
		endTime: number
		isSource: boolean
	}

	videoCall?: {
		videoCallUrl: string
		active: boolean
	}
}

interface Exam {
	examType: string
	name: string
	examDate: number
	startTime: number
	endTime: number
	subject: string
	teachers: string[]
	rooms: string[]
	text: string

	/**
	 * @deprecated the id is always 0
	 */
	id: number
	studentClass: string[]
	assignedStudents: {
		klasse: {
			id: number
			name: string
		}
		displayName: string
		id: number
	}[]
	grade: string
}

interface Grade {
	grade: {
		mark: {
			markValue: number
			markSchemaId: number
			markDisplayValue: number
			name: string
			id: number
		}
		schoolyearId: number
		examTypeId: number
		lastUpdate: number
		exam: {
			markSchemaId: number
			date: number
			name: string
			id: number
		}
		examType: {
			markSchemaId: number
			weightFactor: number
			longname: string
			name: string
			id: number
		}
		markSchemaId: number
		examId: number
		text: string
		date: number
		id: number
	}
	subject: string
	personId: number
}

interface Absence {
	startDate: number
	endDate: number
	startTime: number
	endTime: number
	createdUser: string // the "identifier" of the creator (teacher shortname, student "id")
	reasonId: number // maybe school specific?
	isExcused: boolean

	id: number
	createDate: number
	lastUpdate: number
	updatedUser: string
	reason: string // custom reason?
	text: string
	interruptions: any[]
	canEdit: boolean
	studentName: string
	excuseStatus: string | null

	excuse: {
		// mostly empty, unknown use
		id: number
		text: string
		excuseDate: number
		excuseStatus: string
		isExcused: boolean
		userId: number
		username: string
	}
}

interface ClassRole {
	id: number
	personId: number
	klasse: {
		id: number
		name: string
	}
	foreName: string // first name
	longName: string // last name
	duty: {
		id: number // school specific?
		label: string // duty name
	}
	startDate: number
	endDate: number
	text: string // empty?
}

interface SchoolYear {
	id: number
	name: string
	dateRange: {
		start: string
		end: string
	}
}

//#endregion

//#region User

interface UserData {
	server: string
	school: string
	username: string
}

interface User extends UserData {
	cookies: string[]
	token: string
}

interface FullUser extends User {
	id: number
	displayName: string
	imageUrl: string
}

//#endregion

//#endregion

//#region API

//#region Login

async function login(user: UserData, password: string) {
	console.log(`🔑 Logging in as ${user.username} in school ${user.school} on ${user.server}.webuntis.com`)

	const cookies = await fetchCookies(user, password)
	const token = await fetchBearerToken(user, cookies)
	const fullUser = await fetchUserData({ ...user, cookies, token })

	console.log(
		`🔓 Logged in as ${fullUser.displayName} (${fullUser.username}) in school ${fullUser.school} on ${fullUser.server}.webuntis.com`
	)

	return fullUser
}

async function fetchCookies(user: UserData, password: string) {
	const credentialBody = `school=${user.school}&j_username=${user.username}&j_password=${password}&token=`
	const jSpringUrl = `https://${user.server}.webuntis.com/WebUntis/j_spring_security_check`

	const request = new Request(jSpringUrl)
	request.method = 'POST'
	request.body = credentialBody
	request.headers = {
		Accept: 'application/json',
		'Content-Type': 'application/x-www-form-urlencoded',
	}

	await request.load()

	if (request.response.statusCode == 404) {
		throwError(ErrorCode.NOT_FOUND)
	}

	const cookies = request.response.cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`)

	if (!cookies) {
		throwError(ErrorCode.NO_COOKIES)
	}

	console.log('🍪 Got cookies')

	return cookies
}

async function fetchBearerToken(user: UserData, cookies: string[]) {
	const url = `https://${user.server}.webuntis.com/WebUntis/api/token/new`

	const request = new Request(url)
	request.headers = {
		cookie: cookies.join(';'),
	}

	const token = await request.loadString()

	// throw a LOGIN_ERROR if the response contains the string "loginError"
	if (token.includes('loginError')) {
		throwError(ErrorCode.LOGIN_ERROR)
	}

	if (!token) {
		throwError(ErrorCode.NO_TOKEN)
	}

	console.log('🎟️  Got Bearer Token for Authorization')

	return token
}

async function fetchUserData(user: User) {
	const url = `https://${user.server}.webuntis.com/WebUntis/api/rest/view/v1/app/data`

	const request = new Request(url)
	request.headers = {
		Authorization: `Bearer ${user.token}`,
	}

	const json = await request.loadJSON()

	if (!json || !json.user) {
		throwError(ErrorCode.NO_USER)
	}

	if (json.user.name !== user.username) {
		console.warn(`Username mismatch: ${json.user.name} !== ${user.username}`)
	}

	const fullUser: FullUser = {
		server: user.server,
		school: user.school,
		id: json.user.person.id,
		username: user.username,
		displayName: json.user.person.displayName,
		imageUrl: json.user.person.imageUrl,
		token: user.token,
		cookies: user.cookies,
	}

	console.log(`👤 Got data for user ${fullUser.username} (id: ${fullUser.id}).\n`)

	return fullUser
}

//#endregion

//#region API

function formatDateForUntis(date: Date) {
	const paddedMonth = (date.getMonth() + 1).toString().padStart(2, '0')
	const paddedDay = date.getDate().toString().padStart(2, '0')
	return `${date.getFullYear()}${paddedMonth}${paddedDay}`
}

function prepareRequest(url: string, user: FullUser) {
	const request = new Request(url)
	request.headers = {
		cookie: user.cookies.join(';'),
		Authorization: `Bearer ${user.token}`,
	}
	return request
}

async function fetchLessonsFor(user: FullUser, date: Date = new Date(), config: Config) {
	const urlTimetable = `https://${
		user.server
	}.webuntis.com/WebUntis/api/public/timetable/weekly/data?elementType=5&elementId=${user.id}&date=${
		date.toISOString().split('T')[0]
	}&formatId=2`

	const request = prepareRequest(urlTimetable, user)

	console.log(`📅 Fetching timetable for ${user.username} (id: ${user.id})`)

	const timetableJson = await request.loadJSON()

	const timetableData = timetableJson.data.result.data
	const lessons: Lesson[] = timetableData.elementPeriods[user.id.toString()]

	console.log(`📅 Fetched timetable with ${lessons.length} lessons and ${timetableData.elements.length} elements`)

	const transformedLessons = transformLessons(lessons, timetableData.elements, config)

	console.log(`🧬 Transformed ${Object.keys(transformedLessons).length} lessons`)

	return transformedLessons
}

async function fetchExamsFor(user: FullUser, from: Date, to: Date) {
	const urlExams = `https://${user.server}.webuntis.com/WebUntis/api/exams?studentId=${
		user.id
	}&klasseId=-1&startDate=${formatDateForUntis(from)}&endDate=${formatDateForUntis(to)}`

	const request = prepareRequest(urlExams, user)
	const json = await request.loadJSON()

	if (!json || !json.data || !json.data.exams) {
		console.warn('⚠️ Could not fetch exams!')
	}

	const exams: Exam[] = json.data.exams
	console.log(`📅 Fetched ${exams.length} exams`)

	const transformedExams = transformExams(exams)
	return transformedExams
}

async function fetchGradesFor(user: FullUser, from: Date, to: Date) {
	const urlGrades = `https://${user.server}.webuntis.com/WebUntis/api/classreg/grade/gradeList?personId=${
		user.id
	}&startDate=${formatDateForUntis(from)}&endDate=${formatDateForUntis(to)}`

	const request = prepareRequest(urlGrades, user)
	const json = await request.loadJSON()

	if (!json || !json.data) {
		console.warn('⚠️ Could not fetch grades!')
	}

	const grades: Grade[] = json.data
	console.log(`📅 Fetched ${grades.length} grades`)

	const transformedGrades = transformGrades(grades)
	return transformedGrades
}

async function fetchAbsencesFor(user: FullUser, from: Date, to: Date) {
	const urlAbsences = `https://${user.server}.webuntis.com/WebUntis/api/classreg/absences/students?studentId=${
		user.id
	}&startDate=${formatDateForUntis(from)}&endDate=${formatDateForUntis(
		to
	)}&excuseStatusId=-3&includeTodaysAbsence=true`

	const request = prepareRequest(urlAbsences, user)
	const json = await request.loadJSON()

	if (!json || !json.data || !json.data.absences) {
		console.warn('⚠️ Could not fetch absences!')
	}

	const absences: Absence[] = json.data.absences
	console.log(`📅 Fetched ${absences.length} absences`)

	const transformedAbsences = transformAbsences(absences)
	return transformedAbsences
}

async function fetchClassRolesFor(user: FullUser, from: Date, to: Date) {
	const urlClassRoles = `https://${
		user.server
	}.webuntis.com/WebUntis/api/classreg/classservices?startDate=${formatDateForUntis(
		from
	)}&endDate=${formatDateForUntis(to)}`

	const request = prepareRequest(urlClassRoles, user)
	const json = await request.loadJSON()

	if (!json || !json.data || !json.data.classRoles) {
		console.warn('⚠️ Could not fetch class roles!')
	}

	const classRoles: ClassRole[] = json.data.classRoles
	console.log(`📅 Fetched ${classRoles.length} class roles`)

	const transformedClassRoles = transformClassRoles(classRoles)
	return transformedClassRoles
}

async function fetchSchoolYears(user: FullUser) {
	const url = 'https://arche.webuntis.com/WebUntis/api/rest/view/v1/schoolyears'

	const request = prepareRequest(url, user)
	const json = await request.loadJSON()

	if (!json) {
		console.warn('⚠️ Could not fetch school years!')
	}

	console.log(`📅 Fetched ${json.length} school years`)

	const transformedSchoolYears = transformSchoolYears(json)
	return transformedSchoolYears
}

//#endregion

//#region Transforming

function parseDateNumber(date: number) {
	const dateStr = date.toString()
	const year = dateStr.slice(0, 4)
	const month = dateStr.slice(4, 6)
	const day = dateStr.slice(6, 8)
	return new Date(`${year}-${month}-${day}`)
}

function parseTimeNumber(time: number) {
	const timeStr = time.toString().padStart(4, '0')
	const hours = timeStr.slice(0, 2)
	const minutes = timeStr.slice(2, 4)
	return new Date(`1970-01-01T${hours}:${minutes}`)
}

/**
 * Adds the necessary leading 0s, and combines date and time to a new JS Date object
 * @param date the date as a number, e.g. 20220911
 * @param time the time as a number, e.g. 830
 */
function combineDateAndTime(date: number, time: number) {
	const parsedDate = parseDateNumber(date)
	const parsedTime = parseTimeNumber(time)
	return new Date(parsedDate.getTime() + parsedTime.getTime())
}

/**
 * Transforms the lessons from the API to a more usable format,
 * links them up with the elements, and sorts them by date.
 * Also tries to correct the state.
 * @param lessons the lessons to transform returned from the API
 * @param elements the elements to link to the lessons
 * @param config the config to use for the transformation
 * @returns a transformed lesson week
 */
function transformLessons(lessons: Lesson[], elements: Element[], config: Config): TransformedLessonWeek {
	const transformedLessonWeek: TransformedLessonWeek = {}

	// transform each lesson
	for (const lesson of lessons) {
		// get the linked elements from the list
		const resolvedElements = resolveElements(lesson, elements)
		if (!resolvedElements) {
			console.log(`Could not resolve elements for lesson ${lesson.lessonId}`)
			continue
		}
		const { groups, teachers, subject, rooms } = resolvedElements

		// create the transformed lesson
		const transformedLesson: TransformedLesson = {
			id: lesson.id,

			note: lesson.lessonText,
			text: lesson.periodText,
			info: lesson.periodInfo,
			substitutionText: lesson.substText,

			from: combineDateAndTime(lesson.date, lesson.startTime),
			to: combineDateAndTime(lesson.date, lesson.endTime),

			// get all the elements with the matching type (1), and transform them
			groups: groups,
			teachers: teachers,
			subject: subject,
			rooms: rooms,

			// TODO: add specific teacher substitution
			state: lesson.cellState,
			isEvent: lesson.is.event,
			isRescheduled: 'rescheduleInfo' in lesson,

			duration: 1, // incremented when combining lessons
		}

		const changedTeacherCount = transformedLesson.teachers.filter((teacher) => teacher.original).length
		const changedRoomCount = transformedLesson.rooms.filter((room) => room.original).length

		// set the state depending on what changed, ordered by importance
		if (changedTeacherCount >= 1) {
			transformedLesson.state = LessonState.TEACHER_SUBSTITUTED
		}
		if (changedRoomCount >= 1) {
			// set to substituted if the teacher is also substituted
			if (changedTeacherCount) {
				transformedLesson.state = LessonState.SUBSTITUTED
			}
			transformedLesson.state = LessonState.ROOM_SUBSTITUTED
		}
		if (subject.original) {
			transformedLesson.state = LessonState.SUBSTITUTED
		}

		// add the reschedule info if it exists
		if ('rescheduleInfo' in lesson && lesson.rescheduleInfo) {
			transformedLesson.rescheduleInfo = {
				isSource: lesson.rescheduleInfo.isSource,
				otherFrom: combineDateAndTime(lesson.rescheduleInfo.date, lesson.rescheduleInfo.startTime),
				otherTo: combineDateAndTime(lesson.rescheduleInfo.date, lesson.rescheduleInfo.endTime),
			}
		}

		// add the exam info if it exists
		if ('exam' in lesson && lesson.exam) {
			transformedLesson.exam = {
				name: lesson.exam.name,
				markSchemaId: lesson.exam.markSchemaId,
			}
		}

		// add the lesson with the date as key
		const dateKey = transformedLesson.from.toISOString().split('T')[0]
		if (!transformedLessonWeek[dateKey]) {
			transformedLessonWeek[dateKey] = []
		}

		transformedLessonWeek[dateKey].push(transformedLesson)
	}

	console.log('Sorting...')

	// sort the lessons by start time
	for (const dateKey in transformedLessonWeek) {
		transformedLessonWeek[dateKey].sort((a, b) => a.from.getTime() - b.from.getTime())
	}

	let combinedLessonWeek: TransformedLessonWeek = {}
	// combine lessons which are equal and are directly after each other
	for (const dateKey in transformedLessonWeek) {
		combinedLessonWeek[dateKey] = combineLessons(transformedLessonWeek[dateKey], config)
	}

	return combinedLessonWeek
}

/**
 * Searches for the stateless element with the given id and type in the list of elements.
 * Stateless means that it cannot be substituted. (e.g. the substitution of an element
 * @param id
 * @param type the type as a number, one of the ElementType enum values
 * @param availableElements	the list of elements to search in, given by the API
 * @returns	the found element, or undefined if it was not found
 */
function resolveStatelessElement(id: number, type: number, availableElements: Element[]): StatelessElement {
	const foundElement = availableElements.find((element) => element.id === id && element.type === type)
	const elementBase: StatelessElement = {
		id: id,
		name: foundElement?.name,
	}

	if (!foundElement) return

	if (foundElement.type === ElementType.TEACHER) {
		return elementBase
	}

	const element = elementBase as ExtendedTransformedElement
	element.longName = foundElement.longName

	if (foundElement.type === ElementType.ROOM) {
		const room = element as Room
		room.capacity = foundElement.roomCapacity
		return room
	}

	return element
}

/**
 * Resolves the given unresolved element to a stateful element.
 * @param unresolvedElement the element to resolve, given by the API
 * @param availableElements	the list of elements to search in, given by the API
 * @returns	the resolved element
 */
function resolveStatefulElement(unresolvedElement: UnresolvedElement, availableElements: Element[]) {
	const statelessElement = resolveStatelessElement(unresolvedElement.id, unresolvedElement.type, availableElements)

	const element = statelessElement as StatefulElement
	element.state = unresolvedElement.state

	if (unresolvedElement.orgId && unresolvedElement.orgId !== 0) {
		const originalElement = resolveStatelessElement(
			unresolvedElement.orgId,
			unresolvedElement.type,
			availableElements
		)
		element.original = originalElement
	}

	return element
}

/**
 * Resolves the elements of the given lesson.
 * @param lesson the lesson to resolve the elements for
 * @param elements the list of elements to search in, given by the API
 * @returns the resolved elements (groups, teachers, subject, rooms)
 */
function resolveElements(lesson: Lesson, elements: Element[]) {
	const groups: Stateful<Group>[] = []
	const teachers: Stateful<Teacher>[] = []
	let subject: Stateful<Subject> | undefined
	const rooms: Stateful<Room>[] = []

	for (const unresolvedElement of lesson.elements) {
		const element = resolveStatefulElement(unresolvedElement, elements)

		if (!element) {
			console.warn(`Could not find element ${unresolvedElement.id} with type ${unresolvedElement.type}`)
			continue
		}

		switch (unresolvedElement.type) {
			case ElementType.TEACHER:
				teachers.push(element as Stateful<Teacher>)
				break
			case ElementType.GROUP:
				groups.push(element as Stateful<Group>)
				break
			case ElementType.SUBJECT:
				subject = element as Stateful<Subject>
				break
			case ElementType.ROOM:
				rooms.push(element as Stateful<Room>)
				break
			default:
				console.warn(`Unknown element type ${unresolvedElement.type}`)
				break
		}
	}

	return { groups, teachers, subject, rooms }
}

/**
 * Combines lessons which are directly after each other and have the same properties.
 * @param lessons
 * @param ignoreDetails if true, only the subject and time will be considered
 */
function combineLessons(lessons: TransformedLesson[], config: Config, ignoreDetails = false, ignoreBreaks = false) {
	const combinedLessonsNextDay: TransformedLesson[] = []
	for (const [index, lesson] of lessons.entries()) {
		const previousLesson = combinedLessonsNextDay[combinedLessonsNextDay.length - 1]

		if (
			index !== 0 &&
			previousLesson &&
			shouldCombineLessons(previousLesson, lesson, config, ignoreDetails, ignoreBreaks)
		) {
			// update the break duration
			if (!previousLesson.break) previousLesson.break = 0
			previousLesson.break += lesson.from.getTime() - previousLesson.to.getTime()

			previousLesson.to = lesson.to
			previousLesson.duration++
		} else {
			combinedLessonsNextDay.push(lesson)
		}
	}
	return combinedLessonsNextDay
}

function transformExams(exams: Exam[]) {
	const transformedExams: TransformedExam[] = []

	for (const exam of exams) {
		const transformedExam: TransformedExam = {
			name: exam.name,
			type: exam.examType,
			from: combineDateAndTime(exam.examDate, exam.startTime),
			to: combineDateAndTime(exam.examDate, exam.endTime),
			subject: exam.subject,
			teacherNames: exam.teachers,
			roomNames: exam.rooms,
		}

		transformedExams.push(transformedExam)
	}

	return transformedExams
}

function transformGrades(grades: Grade[]) {
	const transformedGrades: TransformedGrade[] = []
	for (const grade of grades) {
		const transformedGrade: TransformedGrade = {
			subject: grade.subject,
			date: parseDateNumber(grade.grade.date),
			lastUpdated: new Date(grade.grade.lastUpdate),
			text: grade.grade.text,
			schemaId: grade.grade.markSchemaId,

			mark: {
				displayValue: grade.grade.mark.markDisplayValue,
				name: grade.grade.mark.name,
				id: grade.grade.mark.id,
			},

			examType: {
				name: grade.grade.examType.name,
				longName: grade.grade.examType.longname,
			},
		}

		if (grade.grade.exam) {
			transformedGrade.exam = {
				name: grade.grade.exam.name,
				id: grade.grade.exam.id,
				date: parseDateNumber(grade.grade.exam.date),
			}
		}

		transformedGrades.push(transformedGrade)
	}
	return transformedGrades
}

function transformAbsences(absences: Absence[]) {
	const transformedAbsences: TransformedAbsence[] = []
	for (const absence of absences) {
		const transformedAbsence: TransformedAbsence = {
			from: combineDateAndTime(absence.startDate, absence.startTime),
			to: combineDateAndTime(absence.endDate, absence.endTime),
			createdBy: absence.createdUser,
			reasonId: absence.reasonId,
			isExcused: absence.isExcused,
			excusedBy: absence.excuse.username,
		}
		transformedAbsences.push(transformedAbsence)
	}
	return transformedAbsences
}

function transformClassRoles(classRoles: ClassRole[]) {
	const transformedClassRoles: TransformedClassRole[] = []
	for (const classRole of classRoles) {
		const transformedClassRole: TransformedClassRole = {
			fromDate: parseDateNumber(classRole.startDate),
			toDate: parseDateNumber(classRole.endDate),
			firstName: classRole.foreName,
			lastName: classRole.longName,
			dutyName: classRole.duty.label,
		}
		transformedClassRoles.push(transformedClassRole)
	}
	return transformedClassRoles
}

async function transformSchoolYears(schoolYears: SchoolYear[]) {
	const transformedSchoolYears: TransformedSchoolYear[] = []
	for (const schoolYear of schoolYears) {
		const transformedSchoolYear: TransformedSchoolYear = {
			name: schoolYear.name,
			id: schoolYear.id,
			from: new Date(schoolYear.dateRange.start),
			to: new Date(schoolYear.dateRange.end),
		}
		transformedSchoolYears.push(transformedSchoolYear)
	}
	return transformedSchoolYears
}

//#endregion

//#endregion

//#region Caching & Comparing

//#region Caching
interface CachedUser extends FullUser {
	lastUpdated: Date
}

/**
 * Tries to read user data from the cache, or logs in if the cache is too old.
 * @param options
 * @returns
 */
async function prepareUser(options: Options): Promise<FullUser> {
	const CACHE_KEY = 'user'

	const { json, cacheAge, cacheDate } = await readFromCache(CACHE_KEY)

	// if the cache is not too old, return the cached user
	if (json && cacheAge < options.config.cacheHours.user * 60 * 60 * 1000) {
		return JSON.parse(json)
	}

	// get the user data from the keychain
	const userData = await readKeychain(true)
	// log into untis
	const fetchedUser = await login(userData, userData.password)

	// write the user to the cache
	writeToCache({ ...fetchedUser, lastUpdated: new Date() }, CACHE_KEY)

	console.log('👤⬇️ Fetched user from untis and wrote to cache.')

	return fetchedUser
}

/**
 * Reads the given cache file, returns the data or an empty object.
 * @param cacheName the name of the cache file (without extension)
 * @returns the cached json, the cache age in milliseconds and the cache (modification) date or an empty object
 */
async function readFromCache(cacheName: string) {
	const fileManager = FileManager.local()
	const cacheDirectory = fileManager.cacheDirectory()
	const untisCacheDirectory = fileManager.joinPath(cacheDirectory, 'untis')

	if (!fileManager.fileExists(untisCacheDirectory)) {
		console.log('Cache directory does not exist.')
		return {}
	}

	const cachePath = fileManager.joinPath(untisCacheDirectory, `${cacheName}.json`)
	const cacheExists = fileManager.fileExists(cachePath)

	if (!cacheExists) {
		console.log(`Cache for ${cacheName} does not exist.`)
		return {}
	}

	// read the meta data
	const cacheDate = new Date(fileManager.modificationDate(cachePath))
	const cacheAge = new Date().getTime() - cacheDate.getTime()

	console.log(`🗃️ Cache ${cacheName} is ${Math.round(cacheAge / 60_000)}minutes old.`)

	const json = fileManager.readString(cachePath)

	return { json, cacheAge, cacheDate }
}

/**
 * Writes the given data to the cache.
 * @param data the data to cache
 * @param cacheName the name of the cache file (without extension)
 */
function writeToCache(data: Object, cacheName: string) {
	const fileManager = FileManager.local()
	const cacheDirectory = fileManager.cacheDirectory()
	const untisCacheDirectory = fileManager.joinPath(cacheDirectory, 'untis')
	if (!fileManager.fileExists(untisCacheDirectory)) {
		fileManager.createDirectory(untisCacheDirectory, true)
	}
	const cachePath = fileManager.joinPath(untisCacheDirectory, `${cacheName}.json`)
	fileManager.writeString(cachePath, JSON.stringify(data))
	console.log(`🗃️✏️ Wrote cache for ${cacheName}.`)
}

/**
 * Clears the cache by deleting the cache directory.
 */
function clearCache() {
	const fileManager = FileManager.local()
	const cacheDirectory = fileManager.cacheDirectory()
	const untisCacheDirectory = fileManager.joinPath(cacheDirectory, 'untis')
	if (fileManager.fileExists(untisCacheDirectory)) {
		fileManager.remove(untisCacheDirectory)
	}
}
// #endregion

//#region Cache or Fetch

/**
 * Transforms a json date string back to a Date object.
 */
function jsonDateReviver(key: string, value: any) {
	if (typeof value === 'string' && /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/.test(value)) {
		return new Date(value)
	}
	return value
}

/**
 * Tries to read the given cache, or fetches the data if the cache is too old.
 * @param key the key of the cache
 * @param maxAge the maximum age of the cache in milliseconds
 * @param options
 * @param fetchData a function which fetches the fresh data
 * @param compareData a function which compares the fetched data with the cached data for sending notifications
 * @returns the cached or fetched data
 */
async function getCachedOrFetch<T>(
	key: string,
	maxAge: number,
	options: Options,
	fetchData: () => Promise<T>,
	compareData?: (fetchedData: T, cachedData: T, options: Options) => void
): Promise<T> {
	const { json: cachedJson, cacheAge, cacheDate } = await readFromCache(key)

	let cachedData = {} as T

	if (cachedJson) {
		cachedData = JSON.parse(cachedJson, jsonDateReviver)
	}

	let fetchedData: T

	// refetch if the cache is too old (max age exceeded or not the same day)
	if (!cachedJson || cacheAge > maxAge || cacheDate.getDate() !== CURRENT_DATETIME.getDate()) {
		console.log(`Fetching data ${key}, cache invalid.`)

		// we cannot fall back to the cached data if there is no internet,
		// as the script will already have failed when fetching the user
		fetchedData = await fetchData()
		writeToCache(fetchedData, key)
	}

	const areNotificationsEnabled = options.notifications.enabled[key]

	if (!areNotificationsEnabled && NOTIFIABLE_TOPICS.includes(key)) {
		console.log(`Notifications for ${key} are disabled.`)
	}

	if (cachedJson && fetchedData && compareData && areNotificationsEnabled) {
		console.log('There is cached data and fetched data, checking for compare...')
		if (cachedJson === JSON.stringify(fetchedData)) {
			console.log('Data did not change, not comparing.')
		} else {
			compareData(fetchedData, cachedData, options)
		}
	}

	return fetchedData ?? cachedData
}

async function getLessonsFor(user: FullUser, date: Date, isNext: boolean, options: Options) {
	const key = isNext ? 'lessons_next' : 'lessons'
	return getCachedOrFetch(
		key,
		options.config.cacheHours.lessons * 60 * 60 * 1000,
		options,
		() => fetchLessonsFor(user, date, options),
		compareCachedLessons
	)
}

async function getExamsFor(user: FullUser, from: Date, to: Date, options: Options) {
	return getCachedOrFetch(
		'exams',
		options.config.cacheHours.exams * 60 * 60 * 1000,
		options,
		() => fetchExamsFor(user, from, to),
		compareCachedExams
	)
}

async function getGradesFor(user: FullUser, from: Date, to: Date, options: Options) {
	return getCachedOrFetch(
		'grades',
		options.config.cacheHours.grades * 60 * 60 * 1000,
		options,
		() => fetchGradesFor(user, from, to),
		compareCachedGrades
	)
}

async function getAbsencesFor(user: FullUser, from: Date, to: Date, options: Options) {
	return getCachedOrFetch(
		'absences',
		options.config.cacheHours.absences * 60 * 60 * 1000,
		options,
		() => fetchAbsencesFor(user, from, to),
		compareCachedAbsences
	)
}

async function getSchoolYears(user: FullUser, options: Options) {
	return getCachedOrFetch('school_years', options.config.cacheHours.schoolYears * 60 * 60 * 1000, options, () =>
		fetchSchoolYears(user)
	)
}

/**
 * Fetches the timetable for the current week (and for the next week if necessary) and filters which lessons remain for today.
 * @param user the user to fetch for
 * @param options
 * @returns the remaining lessons for today, the lessons tomorrow and the key (date) of the next day
 */
async function getTimetable(user: FullUser, options: Options) {
	// fetch this weeks lessons
	let timetable = await getLessonsFor(user, CURRENT_DATETIME, false, options)

	// get the current day as YYYY-MM-DD
	const todayKey = CURRENT_DATETIME.toISOString().split('T')[0]

	// sort the keys of the timetable (by date)
	const sortedKeys = sortKeysByDate(timetable)
	// find the index of the current day
	const todayIndex = sortedKeys.indexOf(todayKey)
	// get the next day
	let nextDayKey = sortedKeys[todayIndex + 1]

	// fetch the next week, if the next day is on the next week
	if (todayIndex === -1 || todayIndex === sortedKeys.length - 1) {
		// get the first date of the current timetable week
		const firstDate = sortedKeys[0] ? new Date(sortedKeys[0]) : CURRENT_DATETIME
		// get the first date of the next timetable week
		const nextWeekFirstDate = new Date(firstDate.getTime() + 7 * 24 * 60 * 60 * 1000)
		console.log(`No lessons for today/tomorrow -> fetching next week. (${nextWeekFirstDate.toISOString()})`)
		// fetch the next week
		const nextWeekTimetable = await getLessonsFor(user, nextWeekFirstDate, true, options)
		// merge the next week timetable into the current one
		Object.assign(timetable, nextWeekTimetable)
		// set the next day key to the first day of the next week
		nextDayKey = sortKeysByDate(nextWeekTimetable)[0]
	}

	// apply custom lesson configs
	// NOTE: it seems more reasonable to NOT do this while transforming,
	// as these are different tasks and config changes would not behave as expected
	applyLessonConfigs(timetable, options)

	console.log(`Next day: ${nextDayKey}`)
	// the timetable for the next day in the timetable (ignore weekends)
	const lessonsNextDay = timetable[nextDayKey]

	const lessonsToday = timetable[todayKey] ?? []
	// the lessons which have not passed yet
	const lessonsTodayRemaining = lessonsToday.filter((l) => l.to > CURRENT_DATETIME)

	// check the teacher selection from the config
	lessonsTodayRemaining.filter((lesson) => {
		if (!lesson.subject) return true
		const lessonOption = options.lessonOptions[lesson.subject.name]
		if (!lessonOption) return true
		if (Array.isArray(lessonOption)) {
			// check if the teacher is in the lesson
			return lessonOption.some((option) => {
				return lesson.teachers.some((teacher) => teacher.name === option.teacher)
			})
		}
		return true
	})

	return { lessonsTodayRemaining, lessonsNextDay, nextDayKey }
}

//#endregion

//#region Comparing

/**
 * Compares the fetched lessons with the cached lessons and sends notifications for most changes.
 * @param lessonWeek
 * @param cachedLessonWeek
 * @param options
 * @returns
 */
function compareCachedLessons(
	lessonWeek: TransformedLessonWeek,
	cachedLessonWeek: TransformedLessonWeek,
	options: Options
) {
	console.log('Comparing cached lessons with fetched lessons.')

	// loop over the days
	for (const dayKey in lessonWeek) {
		const lessons = lessonWeek[dayKey]
		const cachedLessons = cachedLessonWeek[dayKey]

		if (!cachedLessons) {
			console.log(`No cached lessons for ${dayKey}.`)
			continue
		}

		// check if the lessons for this day are the same
		if (JSON.stringify(lessons) === JSON.stringify(cachedLessons)) {
			console.log(`Lessons for ${dayKey} are the same.`)
			continue
		}

		// loop over the lessons
		for (const lesson of lessons) {
			const subjectTitle = getSubjectTitle(lesson, false)
			const dayString = lesson.from.toLocaleDateString(LOCALE, { weekday: 'long' })

			// check if the lesson is in the cached lessons
			const cachedLesson = cachedLessons.find((l) => l.id === lesson.id)
			if (!cachedLesson) {
				// only notify here if the lesson was not rescheduled
				if (!lesson.isRescheduled) {
					console.log(`Lesson ${lesson.id} is new.`)
					scheduleNotification(`${subjectTitle} was added`, `${subjectTitle} was added on ${dayString}`)
				}
				continue
			}

			// check if the lesson has changed
			if (JSON.stringify(lesson) === JSON.stringify(cachedLesson)) {
				continue
			}

			if (lesson.info !== cachedLesson.info) {
				scheduleNotification(`Info for ${subjectTitle} changed`, `on ${dayString}: "${lesson.info}"`)
				continue
			}

			if (lesson.note !== cachedLesson.note) {
				scheduleNotification(`Note for ${subjectTitle} changed`, `on ${dayString}: "${lesson.note}"`)
				continue
			}

			if (lesson.text !== cachedLesson.text) {
				scheduleNotification(`Text for ${subjectTitle} changed`, `on ${dayString}: "${lesson.text}"`)
				continue
			}

			if (lesson.isRescheduled !== cachedLesson.isRescheduled) {
				// only notify for the source
				if (!lesson.rescheduleInfo.isSource) continue

				// if the day is the same
				if (lesson.rescheduleInfo.otherFrom.getDate() === lesson.rescheduleInfo.otherTo.getDate()) {
					scheduleNotification(
						`${dayString}: ${subjectTitle} was shifted`,
						`from ${asNumericTime(lesson.from)} to ${asNumericTime(lesson.rescheduleInfo.otherFrom)}`
					)
					continue
				}

				scheduleNotification(
					`${dayString}: ${subjectTitle} was rescheduled`,
					`from ${asWeekday(lesson.rescheduleInfo.otherFrom)} to ${asWeekday(lesson.rescheduleInfo.otherTo)}`
				)
				continue
			}

			if (lesson.exam !== cachedLesson.exam) {
				if (lesson.exam) {
					scheduleNotification(
						`Exam for ${subjectTitle} was added`,
						`on ${dayString} at ${asNumericTime(lesson.from)}`
					)
					continue
				}
			}

			if (lesson.state !== cachedLesson.state) {
				const changedRooms = lesson.rooms.filter((room) => room.original)
				const changedTeachers = lesson.teachers.filter((teacher) => teacher.original)

				switch (lesson.state) {
					case LessonState.CANCELED:
					case LessonState.FREE:
						scheduleNotification(
							`${dayString}: ${subjectTitle} was cancelled`,
							`${subjectTitle} at ${asNumericTime(lesson.from)} was cancelled`
						)
						break
					case LessonState.ROOM_SUBSTITUTED:
						for (const room of changedRooms) {
							scheduleNotification(
								`${dayString}: ${subjectTitle} - room changed`,
								`from ${room.original?.name} to ${room.name}`
							)
						}
						break
					case LessonState.TEACHER_SUBSTITUTED:
						for (const teacher of changedTeachers) {
							if (NO_VALUE_PLACEHOLDERS.includes(teacher.name)) {
								scheduleNotification(
									`${dayString}: ${subjectTitle} - teacher cancelled`,
									`teacher ${teacher.original?.name} cancelled`
								)
								return
							}

							scheduleNotification(
								`${dayString}: ${subjectTitle} - teacher substituted`,
								`from ${teacher.original.name} to ${teacher.name}`
							)
						}
						break
					case LessonState.SUBSTITUTED:
						scheduleNotification(
							`${dayString}: ${subjectTitle} substituted`,
							`${getSubjectTitle(lesson)} at ${asNumericTime(lesson.from)} with ${lesson.teachers.join(
								', '
							)} in ${lesson.rooms.join(', ')}`
						)
						break
				}
				continue
			}
		}
	}
}

function compareCachedExams(exams: TransformedExam[], cachedExams: TransformedExam[], options: Options) {
	// find any exams that were added
	for (const exam of exams) {
		const cachedExam = cachedExams.find((cachedExam) => {
			return cachedExam.subject === exam.subject && cachedExam.type === exam.type && cachedExam.from === exam.from
		})

		if (!cachedExam) {
			scheduleNotification(
				`Exam ${exam.subject} on ${exam.from.toLocaleDateString(LOCALE)}`,
				`The ${exam.type} takes place @ ${exam.from.toLocaleTimeString(LOCALE)} in ${
					exam.roomNames.join(', ') || 'an unkonwn room'
				}.`
			)
			continue
		}
	}
}

function compareCachedGrades(grades: TransformedGrade[], cachedExams: TransformedGrade[], options: Options) {
	// find any grades that were added
	for (const grade of grades) {
		const cachedGrade = cachedExams.find((cachedGrade) => JSON.stringify(cachedGrade) === JSON.stringify(grade))

		if (!cachedGrade) {
			scheduleNotification(
				`You received a grade in ${grade.subject}`,
				`you got a "${grade.mark.displayValue}" (${grade.text}) on a ${grade.examType.name}`
			)
			continue
		}
	}
}

function compareCachedAbsences(absences: TransformedAbsence[], cachedAbsences: TransformedAbsence[], options: Options) {
	// find any absences that were added
	for (const absence of absences) {
		const cachedAbsence = cachedAbsences.find(
			(cachedAbsence) => JSON.stringify(cachedAbsence) === JSON.stringify(absence)
		)

		if (!cachedAbsence) {
			scheduleNotification(
				`An absence was added by ${absence.createdBy}`,
				`you were absent from ${absence.from.toLocaleString(LOCALE)} to ${absence.to.toLocaleString(LOCALE)}`
			)
			continue
		}
	}
}

//#endregion

//#endregion

//#region Options

//#region Colors

const unparsedColors = {
	background: {
		primary: '#222629',

		red: '#461E1E',
		orange: '#4E2B03',
		yellow: '#544318',
		lime: '#354611',
		green: '#234010',
		darkGreen: '#1F3221',
		turquoise: '#114633',
		lightBlue: '#0E4043',
		blue: '#222B4A',
		lavender: '#33254F',
		purple: '#3F2156',
		pink: '#4A183F',
		brown: '#37291B',
	},
	text: {
		primary: '#E0EAEF',
		secondary: '#A7B4B8',
		disabled: '#687277',
		red: '#BA4747',
		event: '#DD9939',
	},
}

type UnparsedColors = typeof unparsedColors
type Colors = { [key in keyof UnparsedColors]: { [nestedKey in keyof UnparsedColors[key]]: Color } }

function parseColors(input: UnparsedColors): Colors {
	// go through the colors and parse them
	const colors: any = {}
	for (const key in input) {
		colors[key] = {} as any
		const values = input[key as keyof UnparsedColors]
		for (const nestedKey in values) {
			colors[key][nestedKey] = new Color(values[nestedKey as keyof typeof values])
		}
	}

	return colors
}

const colors = parseColors(unparsedColors)

function getColor(name: string) {
	if (!(name in colors.background)) {
		// check if it is a hex color
		if (/^#?([\da-f]{3}){1,2}$/i.test(name)) {
			return new Color(name)
		}
		console.log(`Color ${name} not found`)
		return colors.background.primary
	}
	return new Color(unparsedColors.background[name as keyof typeof unparsedColors.background])
}

//#endregion

//#region Config

interface SingleLessonOption {
	color: string
	longNameOverride?: string
	ignoreInfo?: string[]
	subjectOverride?: string
}

interface TeacherSpecificLessonOption extends SingleLessonOption {
	teacher: string
}

type LessonOptions = {
	[key: string]: SingleLessonOption | TeacherSpecificLessonOption[]
}

interface Options extends Config {
	useICloud: boolean
	documentsDirectory: string
}

const defaultConfig = {
	lessonOptions: {
		SubjectShortName: {
			color: 'orange',
			subjectOverride: 'CustomSubjectName',
			longNameOverride: 'SubjectLongName',
			ignoreInfo: ['InfoTagWhichShouldBeIgnored'],
		},
		SubjectShortName2: [
			{
				teacher: 'TeacherForWhichThisShouldBeApplied',
				color: 'blue',
				subjectOverride: 'CustomSubjectName',
				longNameOverride: 'SubjectLongName',
				ignoreInfo: ['InfoTagWhichShouldBeIgnored'],
			},
		],
	} as LessonOptions,

	config: {
		locale: 'de-AT',
		breakMinMinutes: 7,
		breakMaxMinutes: 45,
		refreshing: {
			normalScopeHours: 12,
			normalIntervalMinutes: 60,
			lazyIntervalMinutes: 4 * 60,
		},
		cacheHours: {
			user: 0.25,
			lessons: 0.5,
			exams: 24,
			grades: 8,
			absences: 24,
			schoolYears: 24,
		},
	},

	views: {
		lessons: {
			maxCount: 8,
			showCanceled: true,
			showLongBreaks: true,
			skipShortBreaks: true,
			showEndTimes: true,
		},
		exams: {
			maxCount: 3,
			scopeDays: 7,
		},
		grades: {
			maxCount: 1,
			scopeDays: 7,
		},
		absences: {
			maxCount: 3,
		},
	},

	notifications: {
		enabled: {
			lessons: true,
			exams: true,
			grades: true,
			absences: true,
		},
	},

	appearance: {
		cornerRadius: 4,
		spacing: 6,
		padding: 8,
		fontSize: 14,
	},
	summary: {
		showMultiplier: true,
	},
	footer: {
		show: true,
	},
}

type Config = typeof defaultConfig

/**
 * Merges the properties of the source object (may be incomplete) into the target object.
 */
function deepMerge(target: any, source: any) {
	for (const key in source) {
		if (source[key] instanceof Object && key in target) {
			deepMerge(target[key], source[key])
		} else {
			target[key] = source[key]
		}
	}

	return target
}

//#endregion

//#endregion

//#region Views

//#region Absences

function addViewAbsences(
	absences: TransformedAbsence[],
	maxCount: number,
	{ container, width, height }: ViewBuildData,
	options: Options
) {
	let remainingHeight = height
	const lineHeight = getCharHeight(options.appearance.fontSize)
	const padding = 4

	if (height < lineHeight + 2 * padding) return 0

	let absenceCount = 0

	// add the remaining lessons until the max item count is reached
	for (let i = 0; i < absences.length; i++) {
		const absence = absences[i]

		if (absence.isExcused) continue

		// subtract the spacing between the items
		if (i > 0) remainingHeight -= options.appearance.spacing

		const absenceContainer = container.addStack()
		absenceContainer.layoutHorizontally()
		absenceContainer.spacing = options.appearance.spacing
		absenceContainer.backgroundColor = colors.background.primary
		absenceContainer.cornerRadius = options.appearance.cornerRadius

		const flowLayoutRow = new FlowLayoutRow(
			width,
			remainingHeight,
			options.appearance.cornerRadius,
			padding,
			absenceContainer
		)

		flowLayoutRow.addIcon('pills.circle', options.appearance.fontSize, colors.text.secondary)

		// if the absence is not longer than one day, show the date and duration
		if (absence.to.getDate() === absence.from.getDate() && absence.to.getMonth() === absence.from.getMonth()) {
			const fromDate = absence.from.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' })
			flowLayoutRow.addText(
				fromDate,
				Font.mediumSystemFont(options.appearance.fontSize),
				options.appearance.fontSize,
				colors.text.primary
			)

			// the duration in minutes
			const duration = (absence.to.getTime() - absence.from.getTime()) / 1000 / 60
			const hours = Math.floor(duration / 60).toString()
			const minutes = Math.floor(duration % 60)
				.toString()
				.padStart(2, '0')
			// the duration as hh:mm
			const durationString = `${hours}h${minutes}`
			flowLayoutRow.addText(
				durationString,
				Font.mediumSystemFont(options.appearance.fontSize),
				options.appearance.fontSize,
				colors.text.secondary
			)
		}
		// if the absence is longer than one day, show the start and end date as "dd.mm - dd.mm"
		else {
			const from = absence.from.toLocaleString(LOCALE, { day: 'numeric', month: 'short' })
			const to = absence.to.toLocaleString(LOCALE, { day: 'numeric', month: 'short' })
			flowLayoutRow.addText(
				from,
				Font.mediumSystemFont(options.appearance.fontSize),
				options.appearance.fontSize,
				colors.text.primary
			)
			flowLayoutRow.addText(
				'-',
				Font.mediumSystemFont(options.appearance.fontSize),
				options.appearance.fontSize,
				colors.text.secondary
			)
			flowLayoutRow.addText(
				to,
				Font.mediumSystemFont(options.appearance.fontSize),
				options.appearance.fontSize,
				colors.text.primary
			)
		}

		const { resultingWidth, resultingHeight } = flowLayoutRow.finish()

		remainingHeight -= resultingHeight
		absenceCount++

		// exit if the max item count is reached
		if (absenceCount >= maxCount) break

		// exit if it would get too big, use the maximum height
		if (remainingHeight - 2 * lineHeight + options.appearance.spacing < 0) break
	}

	return height - remainingHeight
}

//#endregion

//#region Exams

function addViewExams(
	exams: TransformedExam[],
	maxCount: number,
	{ container, width, height }: ViewBuildData,
	config: Config
) {
	let remainingHeight = height
	const charHeight = getCharHeight(config.appearance.fontSize)
	const charWidth = getCharWidth(config.appearance.fontSize)
	const padding = 4

	if (height < charHeight + 2 * padding) return 0

	const sortedExams = exams.sort((a, b) => a.from.getTime() - b.from.getTime())

	// the minimum width of an exam: padding + icon + subject + type + date
	let minimumWidth = 2 * padding + charHeight + getCharWidth(config.appearance.fontSize) * (6 + 5 + 6)

	// show the exam type if it fits
	let useExamType = false
	if (minimumWidth <= width) {
		useExamType = true
	}
	// show the long subject name if it fits (4 more characters)
	let useLongSubjectName = false
	if (width > minimumWidth + 4 * charWidth) {
		minimumWidth += 4 * charWidth
		useLongSubjectName = true
	}
	// show the weekday if it fits (4 more characters)
	let useWeekday = false
	if (width > minimumWidth + 4 * charWidth) {
		minimumWidth += 4 * charWidth
		useWeekday = true
	}

	let lessonCount = 0

	// add the remaining lessons until the max item count is reached
	for (let i = 0; i < sortedExams.length; i++) {
		const exam = sortedExams[i]

		// continue if the exam has already passed
		if (exam.to < CURRENT_DATETIME) continue

		// continue is not in the scope
		const daysUntilExam = Math.floor((exam.from.getTime() - CURRENT_DATETIME.getTime()) / 1000 / 60 / 60 / 24)

		if (config.views.exams.scopeDays && daysUntilExam > config.views.exams.scopeDays) continue

		// subtract the spacing between the items
		if (i > 0) remainingHeight -= config.appearance.spacing

		const examContainer = container.addStack()
		examContainer.layoutHorizontally()
		examContainer.spacing = config.appearance.spacing
		examContainer.backgroundColor = colors.background.primary
		examContainer.cornerRadius = config.appearance.cornerRadius

		const flowLayoutRow = new FlowLayoutRow(
			width,
			remainingHeight,
			config.appearance.spacing,
			padding,
			examContainer
		)

		flowLayoutRow.addIcon('book.circle', config.appearance.fontSize, colors.text.secondary)

		let customOption = config.lessonOptions[exam.subject]
		if (customOption && !Array.isArray(customOption)) {
			exam.subject = customOption.subjectOverride ?? exam.subject
			if (useLongSubjectName && customOption.longNameOverride) {
				exam.subject = customOption.longNameOverride
			}
		}

		flowLayoutRow.addText(
			exam.subject,
			Font.mediumSystemFont(config.appearance.fontSize),
			config.appearance.fontSize,
			colors.text.primary
		)

		if (useExamType) {
			flowLayoutRow.addText(
				exam.type,
				Font.mediumSystemFont(config.appearance.fontSize),
				config.appearance.fontSize,
				colors.text.secondary
			)
		}

		let dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
		if (useWeekday) dateFormat.weekday = 'short'
		const date = exam.from.toLocaleString(LOCALE, dateFormat)
		flowLayoutRow.addText(
			date,
			Font.regularSystemFont(config.appearance.fontSize),
			config.appearance.fontSize,
			colors.text.primary
		)

		const { resultingWidth, resultingHeight } = flowLayoutRow.finish()

		remainingHeight -= resultingHeight
		lessonCount++

		// exit if the max item count is reached
		if (maxCount && lessonCount >= maxCount) break

		// exit if it would get too big, use the maximum height
		if (remainingHeight - 3 * charHeight + 2 * config.appearance.spacing < 0) break
	}

	return height - remainingHeight
}

//#endregion

//#region Grades

function addViewGrades(
	grades: TransformedGrade[],
	maxCount: number,
	{ container, width, height }: ViewBuildData,
	config: Options
) {
	let remainingHeight = height
	const lineHeight = getCharHeight(config.appearance.fontSize)
	const padding = 4

	if (height < lineHeight + 2 * padding) return 0

	// sort the grades by date (newest first)
	const sortedGrades = grades.sort((a, b) => b.date.getTime() - a.date.getTime())

	let gradeCount = 0

	// add the remaining lessons until the max item count is reached
	for (let i = 0; i < sortedGrades.length; i++) {
		const grade = sortedGrades[i]

		// subtract the spacing between the items
		if (i > 0) remainingHeight -= config.appearance.spacing

		const gradeContainer = container.addStack()
		gradeContainer.layoutHorizontally()
		gradeContainer.spacing = config.appearance.spacing
		gradeContainer.backgroundColor = colors.background.primary
		gradeContainer.cornerRadius = config.appearance.cornerRadius

		const flowLayoutRow = new FlowLayoutRow(
			width,
			remainingHeight,
			config.appearance.spacing,
			padding,
			gradeContainer
		)

		let usingIcon = true
		let symbolName = 'circle'

		if (grade.schemaId === 1) {
			// 1 - 5
			symbolName = `${grade.mark.displayValue}.circle`
		} else if (grade.schemaId === 3) {
			// +, ~, -
			if (grade.mark.displayValue === 1) symbolName = 'plus.square'
			else if (grade.mark.displayValue === 2) symbolName = 'equal.square'
			else if (grade.mark.displayValue === 3) symbolName = 'minus.square'
		} else if (grade.schemaId === 24) {
			// ++, +, ~, -
			if (grade.mark.displayValue === 1) symbolName = 'cross.circle'
			else if (grade.mark.displayValue === 2) symbolName = 'plus.circle'
			else if (grade.mark.displayValue === 3) symbolName = 'equal.circle'
			else if (grade.mark.displayValue === 4) symbolName = 'minus.circle'
		} else {
			usingIcon = false
		}

		if (usingIcon) {
			flowLayoutRow.addIcon(symbolName, config.appearance.fontSize, colors.text.primary)
		} else {
			flowLayoutRow.addText(
				grade.mark.name,
				Font.mediumSystemFont(config.appearance.fontSize),
				config.appearance.fontSize,
				colors.text.primary
			)
		}

		flowLayoutRow.addText(
			grade.subject,
			Font.mediumSystemFont(config.appearance.fontSize),
			config.appearance.fontSize,
			colors.text.primary
		)

		flowLayoutRow.addText(
			grade.examType.name,
			Font.regularSystemFont(config.appearance.fontSize),
			config.appearance.fontSize,
			colors.text.secondary
		)

		const { resultingWidth, resultingHeight } = flowLayoutRow.finish()

		remainingHeight -= resultingHeight
		gradeCount++

		// exit if the max item count is reached
		if (maxCount && gradeCount >= maxCount) break

		// exit if it would get too big, use the maximum height
		if (remainingHeight - 3 * lineHeight + 2 * config.appearance.spacing < 0) break
	}

	return height - remainingHeight
}

//#endregion

//#region Lessons

function addViewLessons(
	lessons: TransformedLesson[],
	count: number | undefined,
	{ container, width, height }: ViewBuildData,
	config: Config
) {
	// only allow up to x items to avoid overflow
	let itemCount = 0

	const padding = 4
	const lessonHeight = getCharHeight(config.appearance.fontSize) + 2 * padding

	const innerSpacing = config.appearance.spacing
	// the width including: padding, subject, spacing and icon
	const lessonWidth =
		2 * padding +
		getCharWidth(config.appearance.fontSize) * MAX_SUBJECT_NAME_LENGTH +
		innerSpacing +
		getCharHeight(config.appearance.fontSize)
	const timeWidth = getTextWidth(MAX_TIME_STRING, config.appearance.fontSize) + 2 * padding
	let currentWidth = lessonWidth + config.appearance.spacing + timeWidth

	let showToTime = false

	// check if there is space for a "to" time
	if (currentWidth + config.appearance.spacing + timeWidth <= width) {
		showToTime = config.views.lessons.showEndTimes
		currentWidth += config.appearance.spacing + timeWidth
	}

	let remainingHeight = height

	// add the remaining lessons until the max item count is reached
	for (let i = 0; i < lessons.length; i++) {
		const previousLesson = lessons[i - 1]
		const lesson = lessons[i]

		// take into account the spacing between the lessons
		if (i > 0) {
			remainingHeight -= config.appearance.spacing
		}

		// check for a break if the previous lesson exists
		if (previousLesson) {
			// if the gap between the previous lesson and this lesson is too big, add a break
			const gapDuration = lesson.from.getTime() - previousLesson.to.getTime()
			if (
				previousLesson &&
				config.views.lessons.showLongBreaks &&
				gapDuration > config.config.breakMaxMinutes * 60 * 1000
			) {
				addBreak(container, previousLesson.to, lesson.from, showToTime, config)
				itemCount++
				remainingHeight -= config.appearance.spacing + lessonHeight
				if ((count && itemCount >= count) || remainingHeight < lessonHeight + config.appearance.spacing) break
			}
		}

		// check if the user wants to show canceled lessons
		const isRescheduled = lesson.isRescheduled && lesson.rescheduleInfo.isSource
		const istCancelled = lesson.state === LessonState.CANCELED || lesson.state === LessonState.FREE || isRescheduled
		if (!config.views.lessons.showCanceled && istCancelled) continue

		// only show the time if the previous lesson didn't start at the same time
		const showTime = !previousLesson || previousLesson.from.getTime() !== lesson.from.getTime()
		// if there is space for more text (longer subject name)
		const useSubjectLongName =
			currentWidth + MAX_LONG_SUBJECT_NAME_LENGTH + getCharWidth(config.appearance.fontSize) <= width
		addWidgetLesson(lesson, container, config, { showTime, showToTime, useSubjectLongName })

		itemCount++
		remainingHeight -= lessonHeight

		// exit if the max item count is reached
		if (count && itemCount >= count) break
		// exit if it would get too big
		if (remainingHeight < lessonHeight + config.appearance.spacing) break
	}

	const remainingFontSize = config.appearance.fontSize * 0.8
	// add a "+ x more" if there are more lessons and there is enough space
	if (lessons.length > itemCount && remainingHeight > getCharHeight(remainingFontSize) + config.appearance.spacing) {
		const realLessons = filterCanceledLessons(lessons.slice(itemCount - 1))
		const dayToString = asNumericTime(realLessons[realLessons.length - 1].to)
		// count the number of remaining lessons including the duration
		const lessonCount = realLessons.reduce((acc, lesson) => {
			return acc + lesson.duration
		}, 0)
		const andMoreText = container.addText(` + ${lessonCount} more, until ${dayToString}`)
		console.log(`Added label for ${lessonCount} more lessons until ${dayToString}`)
		andMoreText.font = Font.regularSystemFont(remainingFontSize)
		andMoreText.textColor = colors.text.secondary
		remainingHeight -= getCharHeight(remainingFontSize) + config.appearance.spacing
	}

	return height - remainingHeight
}

//#endregion

//#region Preview

function addViewPreview(
	lessons: TransformedLesson[],
	nextDayKey: string,
	{ container, width, height }: ViewBuildData,
	config: Config
) {
	const titleHeight = getCharHeight(config.appearance.fontSize)
	const subjectHeight = getCharHeight(config.appearance.fontSize) + 8
	let currentHeight = 0

	// if the next lesson is more than 3 days away, don't show the preview
	if (lessons[0].from.getTime() > CURRENT_DATETIME.getTime() + 3 * 24 * 60 * 60 * 1000) {
		console.log('Not showing preview because the next lesson is more than 3 days away')
		const padding = 4
		const containerHeight = 2 * getCharHeight(config.appearance.fontSize) + 2 * padding

		const messageContainer = container.addStack()
		messageContainer.layoutHorizontally()
		messageContainer.setPadding(padding, padding, padding, padding)
		messageContainer.spacing = config.appearance.spacing
		messageContainer.backgroundColor = colors.background.primary
		messageContainer.cornerRadius = config.appearance.cornerRadius
		messageContainer.size = new Size(width, containerHeight)

		const text = messageContainer.addText('No lessons in the next 3 days! 🥳')
		text.textColor = colors.text.event
		text.font = Font.semiboldRoundedSystemFont(config.appearance.fontSize)
		text.leftAlignText()

		messageContainer.addSpacer()

		return containerHeight
	}

	// add information about the next day if there is enough space
	if (lessons && height > titleHeight) {
		addPreviewTitle(container, lessons, nextDayKey, width, config)
		currentHeight += titleHeight + config.appearance.spacing

		// TODO: might cause overflow, as the height is not checked
		if (height - currentHeight > subjectHeight) {
			currentHeight +=
				addPreviewList(container, lessons, config, width, height - currentHeight).resultingHeight +
				config.appearance.spacing
		}
	}
	return currentHeight
}

function filterCanceledLessons(lessons: TransformedLesson[]) {
	// filter out lessons which don't take place
	return lessons.filter((lesson) => {
		if (lesson.state === LessonState.FREE || lesson.state === LessonState.CANCELED) return false
		if (lesson.state === LessonState.RESCHEDULED && lesson.rescheduleInfo?.isSource) return false
		return true
	})
}

/**
 * Adds a title for the preview containing the weekday,
 * and from when to when the lessons take place ignoring canceled lessons.
 */
function addPreviewTitle(
	container: ListWidget | WidgetStack,
	lessons: TransformedLesson[],
	nextDayKey: string,
	width: number,
	config: Config
) {
	const nextDayHeader = container.addStack()
	nextDayHeader.layoutHorizontally()
	nextDayHeader.spacing = 4
	nextDayHeader.bottomAlignContent()

	// get the weekday string
	const useLongName = width > 22 * getCharWidth(config.appearance.fontSize)
	const weekdayFormat = useLongName ? 'long' : 'short'
	const title = nextDayHeader.addText(
		new Date(nextDayKey).toLocaleDateString(LOCALE, { weekday: weekdayFormat }) + ':'
	)
	title.font = Font.semiboldSystemFont(config.appearance.fontSize)
	title.textColor = colors.text.primary
	title.lineLimit = 1

	nextDayHeader.addSpacer()

	// show from when to when the next day takes place
	const realLessons = filterCanceledLessons(lessons)
	const dayFromString = asNumericTime(realLessons[0].from)
	const dayToString = asNumericTime(realLessons[realLessons.length - 1].to)

	const fromToText = nextDayHeader.addText(`${dayFromString} - ${dayToString}`)
	fromToText.font = Font.mediumSystemFont(config.appearance.fontSize)
	fromToText.textColor = colors.text.primary
}

/**
 * Adds a list of subjects of the given day to the widget.
 */
function addPreviewList(
	container: WidgetStack,
	lessons: TransformedLesson[],
	config: Config,
	width: number,
	height: number
) {
	// combine lessons if they have the same subject and are after each other
	const combinedLessonsNextDay = combineLessons(lessons, config, true, true)

	const spacing = 4

	// add a container for the list of subjects
	const subjectListContainer = container.addStack()
	subjectListContainer.layoutVertically()
	subjectListContainer.spacing = spacing

	const padding = 4

	const flowLayoutRow = new FlowLayoutRow(width, height, config.appearance.spacing, 0, subjectListContainer)

	for (const lesson of combinedLessonsNextDay) {
		// skip the subject if it is 'free'
		if (lesson.state === LessonState.FREE) continue

		let subjectWidth = getTextWidth(getSubjectTitle(lesson), config.appearance.fontSize) + 2 * padding
		if (config.summary.showMultiplier && lesson.duration > 1) {
			subjectWidth += getTextWidth('x2', config.appearance.fontSize) + spacing
		}

		const subjectContainer = flowLayoutRow.addContainer(
			subjectWidth,
			getCharHeight(config.appearance.fontSize) + 8,
			true
		)

		if (subjectContainer) {
			fillContainerWithSubject(lesson, subjectContainer, config)
		}
	}

	return flowLayoutRow.finish()
}

//#endregion

//#endregion

//#region Helpers

//#region Build Helpers

/**
 * Adds a SFSymbol with the correct outer size to match the font size.
 */
function addSymbol(
	name: string,
	to: WidgetStack | ListWidget,
	options: { color: Color; size: number; outerSize?: number }
) {
	const icon = SFSymbol.named(name)
	icon.applyFont(Font.mediumSystemFont(options.size))
	const iconImage = to.addImage(icon.image)
	const outerSize = options.outerSize ?? getCharHeight(options.size)
	iconImage.imageSize = new Size(outerSize, outerSize)
	iconImage.resizable = false
	iconImage.tintColor = options.color
	return iconImage
}

/**
 * Adds a break to the widget.
 */
function addBreak(to: WidgetStack | ListWidget, breakFrom: Date, breakTo: Date, showToTime: boolean, config: Config) {
	const breakContainer = makeTimelineEntry(to, breakFrom, config, {
		backgroundColor: colors.background.primary,
		showTime: true,
		showToTime: showToTime,
		toTime: breakTo,
	})
	const breakTitle = breakContainer.addText('Break')
	breakTitle.font = Font.mediumSystemFont(config.appearance.fontSize)
	breakTitle.textColor = colors.text.secondary
	breakContainer.addSpacer()
}

/**
 * Creates a "timeline entry" which is a container (you can add content to) with the time on the left.
 * @param to the container to add the entry to
 * @param time the from time of the entry
 * @param config
 * @param options additional options
 * @returns the first stack of the entry, which can be used to add content
 */
function makeTimelineEntry(
	to: WidgetStack | ListWidget,
	time: Date,
	config: Config,
	options: {
		showTime?: boolean
		showToTime?: boolean
		toTime?: Date
		backgroundColor?: Color
	} = { showTime: true }
) {
	const padding = 4

	const lessonWrapper = to.addStack()
	lessonWrapper.layoutHorizontally()
	lessonWrapper.spacing = config.appearance.spacing

	const lessonContainer = lessonWrapper.addStack()
	lessonContainer.backgroundColor = options.backgroundColor
	lessonContainer.layoutHorizontally()
	lessonContainer.setPadding(padding, padding, padding, padding)
	lessonContainer.cornerRadius = config.appearance.cornerRadius

	if (options.showTime) {
		const timeWrapper = lessonWrapper.addStack()
		timeWrapper.backgroundColor = options.backgroundColor
		timeWrapper.setPadding(padding, padding, padding, padding)
		timeWrapper.cornerRadius = config.appearance.cornerRadius
		timeWrapper.size = new Size(
			getTextWidth(MAX_TIME_STRING, config.appearance.fontSize) + 2 * padding,
			getCharHeight(config.appearance.fontSize) + 2 * padding
		)

		const timeText = timeWrapper.addDate(new Date(time))
		timeText.font = Font.mediumSystemFont(config.appearance.fontSize)
		timeText.textColor = colors.text.primary
		timeText.rightAlignText()
		timeText.applyTimeStyle()

		if (options.showToTime) {
			const timeToWrapper = lessonWrapper.addStack()
			timeToWrapper.backgroundColor = options.backgroundColor
			timeToWrapper.setPadding(padding, padding, padding, padding)
			timeToWrapper.cornerRadius = config.appearance.cornerRadius
			timeToWrapper.size = new Size(
				getTextWidth(MAX_TIME_STRING, config.appearance.fontSize) + 2 * padding,
				getCharHeight(config.appearance.fontSize) + 2 * padding
			)

			const timeToText = timeToWrapper.addDate(new Date(options.toTime))
			timeToText.font = Font.mediumSystemFont(config.appearance.fontSize)
			timeToText.textColor = colors.text.primary
			timeToText.rightAlignText()
			timeToText.applyTimeStyle()
		}
	}

	return lessonContainer
}

/**
 * Adds a lesson to the widget. This includes its subject, additional info (as an icon) and the time.
 * The state is also shown as through colors. (canceled, event)
 * @param lesson the lesson to add
 * @param to the container to add the lesson to
 * @param config
 * @param options
 */
function addWidgetLesson(
	lesson: TransformedLesson,
	to: ListWidget | WidgetStack,
	config: Config,
	options: {
		showTime: boolean
		showToTime: boolean
		useSubjectLongName: boolean
	} = {
		showTime: true,
		showToTime: false,
		useSubjectLongName: false,
	}
) {
	const isCanceled = lesson.state === LessonState.CANCELED
	const isCanceledOrFree = isCanceled || lesson.state === LessonState.FREE
	const isRescheduled = lesson.state === LessonState.RESCHEDULED && lesson.rescheduleInfo?.isSource

	// define the colors
	let backgroundColor = getColor(lesson.backgroundColor)
	let textColor = colors.text.primary
	let iconColor: Color = colors.text.secondary

	// adjust the colors for canceled lessons and similar
	if (lesson.state === LessonState.CANCELED || lesson.state === LessonState.FREE || isRescheduled) {
		backgroundColor = colors.background.primary
		textColor = colors.text.disabled
		iconColor = colors.text.disabled
	}

	// consider breaks during the combined lesson
	let toTime = lesson.to
	if (config.views.lessons.skipShortBreaks && lesson.break) {
		toTime = new Date(lesson.to.getTime() - lesson.break)
	}

	// add the entry with the time
	const lessonContainer = makeTimelineEntry(to, lesson.from, config, {
		showTime: options.showTime,
		showToTime: options.showToTime,
		toTime: toTime,
		backgroundColor: backgroundColor,
	})
	lessonContainer.spacing = config.appearance.spacing

	// add the name of the subject
	const lessonText = lessonContainer.addText(getSubjectTitle(lesson, options.useSubjectLongName))
	lessonText.font = Font.semiboldSystemFont(config.appearance.fontSize)
	lessonText.textColor = textColor
	lessonText.leftAlignText()
	lessonText.lineLimit = 1

	// add a x2 for double lessons etc.
	if (lesson.duration > 1) {
		const durationText = lessonContainer.addText(`x${lesson.duration}`)
		durationText.font = Font.mediumSystemFont(config.appearance.fontSize)
		durationText.textColor = isCanceled ? colors.text.disabled : colors.text.secondary
	}

	let iconName: string | undefined = undefined

	// add icons for the lesson state
	if (lesson.isEvent) {
		iconName = 'calendar.circle'
	} else if (isCanceledOrFree && !lesson.isRescheduled) {
		iconName = 'xmark.circle'
		if (isCanceled) iconColor = colors.text.red
	} else if (lesson.state === LessonState.ADDITIONAL) {
		iconName = 'plus.circle'
	} else if (lesson.state === LessonState.RESCHEDULED) {
		iconName = 'calendar.circle'
	} else if (lesson.state === LessonState.EXAM) {
		iconName = 'book.circle'
	} else if (lesson.state === LessonState.SUBSTITUTED) {
		iconName = 'person.circle'
	} else if (lesson.state === LessonState.ROOM_SUBSTITUTED) {
		iconName = 'location.circle'
	} else if (lesson.state === LessonState.FREE) {
		iconName = 'bell.circle'
	} else if (lesson.text || lesson.info || lesson.note) {
		iconName = 'info.circle'
	}

	if (!iconName) {
		lessonContainer.addSpacer()
	}

	if (lesson.isRescheduled && lesson.rescheduleInfo?.isSource) {
		const iconShift = addSymbol('arrow.right', lessonContainer, {
			color: isCanceled ? colors.text.disabled : colors.text.secondary,
			size: config.appearance.fontSize * 0.8,
		})
		// manually correct the arrow box
		iconShift.imageSize = new Size(
			getCharWidth(config.appearance.fontSize * 0.8),
			getCharHeight(config.appearance.fontSize)
		)
		// display the time it was rescheduled to
		// const rescheduledTimeWrapper = lessonContainer.addStack()
		const rescheduledTime = lessonContainer.addText(asNumericTime(lesson.rescheduleInfo?.otherFrom))
		rescheduledTime.font = Font.mediumSystemFont(config.appearance.fontSize)
		rescheduledTime.textColor = isCanceled ? colors.text.disabled : colors.text.secondary
	}

	if (iconName) {
		// TODO: this does not work properly (min width?) - e.g. 2022-09-19
		lessonContainer.addSpacer()
		addSymbol(iconName, lessonContainer, { color: iconColor, size: config.appearance.fontSize })
	}
}

/**
 * Fills/transforms the given container with the given lesson information.
 * @param lesson
 * @param container
 * @param config
 */
function fillContainerWithSubject(lesson: TransformedLesson, container: WidgetStack, config: Config) {
	let backgroundColor = getColor(lesson.backgroundColor)
	let textColor = colors.text.primary

	// apply the colors for canceled lessons and similar
	if (lesson.state === LessonState.CANCELED) {
		backgroundColor = colors.background.primary
		textColor = colors.text.red
	} else if (lesson.state === LessonState.FREE) {
		backgroundColor = colors.background.primary
		textColor = colors.text.disabled
	} else if (lesson.state === LessonState.RESCHEDULED) {
		// only show as primary if it is not the source -> it is the one that takes place
		if (lesson.rescheduleInfo?.isSource) {
			backgroundColor = colors.background.primary
			textColor = colors.text.disabled
		} else {
			backgroundColor = colors.background.primary
			textColor = colors.text.primary
		}
	} else if (lesson.isEvent) {
		backgroundColor = colors.background.primary
		textColor = colors.text.event
	}

	container.backgroundColor = backgroundColor
	container.layoutHorizontally()
	container.setPadding(4, 4, 4, 4)
	container.cornerRadius = config.appearance.cornerRadius
	container.spacing = config.appearance.spacing

	// add the name of the subject
	const subjectText = container.addText(getSubjectTitle(lesson))
	subjectText.font = Font.mediumSystemFont(config.appearance.fontSize)
	subjectText.textColor = textColor
	subjectText.leftAlignText()
	subjectText.minimumScaleFactor = 1
	subjectText.lineLimit = 1

	// add a x2 for double lessons etc.
	if (config.summary.showMultiplier && lesson.duration > 1) {
		const durationText = container.addText(`x${lesson.duration}`)
		durationText.font = Font.mediumSystemFont(config.appearance.fontSize)
		durationText.textColor = colors.text.secondary
	}
}

//#endregion

//#region File System

function getFileManagerOptions() {
	const useICloud = FileManager.local().isFileStoredIniCloud(module.filename)
	const fileManager = useICloud ? FileManager.iCloud() : FileManager.local()

	const documentsDirectory = fileManager.documentsDirectory()

	// const appFolderName = 'untis'
	// const appDirectory = fileManager.joinPath(documentsDirectory, appFolderName)

	// if (!fileManager.fileExists(appDirectory)) {
	// 	console.log('Created app directory.')
	// 	fileManager.createDirectory(appDirectory, true)
	// }

	return { useICloud, documentsDirectory }
}

/**
 * Reads the config from the file system and if it does not exist, creates it with the default config.
 * @param documentsDirectory the scriptable documents directory
 * @param useICloud
 * @returns
 */
async function readConfig(documentsDirectory: string, useICloud: boolean) {
	const fileManager = useICloud ? FileManager.iCloud() : FileManager.local()
	const configFileName = 'untis-config.json'
	const configPath = fileManager.joinPath(documentsDirectory, configFileName)

	if (!fileManager.fileExists(configPath)) {
		console.log('Created config file with default config.')
		fileManager.writeString(configPath, JSON.stringify(defaultConfig))
	}

	if (useICloud) {
		await fileManager.downloadFileFromiCloud(configPath)
	}

	const fileConfig: Config = JSON.parse(fileManager.readString(configPath))

	// combine the defaultConfig and read config and write it to config
	return deepMerge(defaultConfig, fileConfig)
}

//#endregion

//#region Flow Layout

/**
 * A helper class which can be used to lay out items in a horizontal flow layout.
 * This makes it possible to wrap to the next line if the items exceed the maximum width.
 */
class FlowLayoutRow {
	private currentRowWidth = 0
	private currentRowHeight = 0
	private previousTotalHeight = 0
	private currentRow: WidgetStack

	constructor(
		public readonly maxWidth: number,
		public readonly maxHeight: number,
		public readonly spacing: number,
		public readonly padding: number,
		public readonly container: WidgetStack
	) {
		this.container.layoutVertically()
		if (padding > 0) {
			this.container.setPadding(padding, padding, padding, padding)
		}
		this.currentRow = this.container.addStack()
		this.currentRow.layoutHorizontally()
		this.currentRow.spacing = spacing
		this.maxWidth -= padding * 2
		this.maxHeight -= padding * 2
	}

	private addRow() {
		if (this.previousTotalHeight > this.maxHeight) {
			// console.warn('FlowLayoutRow: Cannot add row, max height reached')
			return
		}
		if (this.currentRowHeight !== 0) {
			this.previousTotalHeight += this.currentRowHeight + this.spacing
		}
		this.currentRow = this.container.addStack()
		this.currentRow.layoutHorizontally()
		this.currentRow.spacing = this.spacing
		this.currentRowWidth = 0
		this.currentRowHeight = 0
	}

	private checkCreateRow(componentWidth: number, componentHeight: number) {
		let spacing = this.currentRowWidth === 0 ? 0 : this.spacing
		const theoreticalWidth = this.currentRowWidth + componentWidth + spacing

		// add a new row if the width is not enough
		if (this.currentRowWidth !== 0 && theoreticalWidth > this.maxWidth) {
			this.addRow()
		}

		// check if the height would overflow
		if (componentHeight > this.currentRowHeight) {
			if (this.previousTotalHeight + this.currentRowHeight > this.maxHeight) {
				return false
			}
			// update the current row height
			this.currentRowHeight = componentHeight
		}

		this.currentRowWidth += componentWidth + spacing

		return true
	}

	public addText(text: string, font: Font, fontSize: number, color: Color) {
		const width = getTextWidth(text, fontSize)
		if (!this.checkCreateRow(width, getCharHeight(fontSize))) {
			return false
		}
		const textElement = this.currentRow.addText(text)
		textElement.font = font
		textElement.textColor = color
		textElement.lineLimit = 1
		return true
	}

	public addIcon(icon: string, size: number, color: Color) {
		if (!this.checkCreateRow(size * 1.1, size * 1.1)) {
			return false
		}
		addSymbol(icon, this.currentRow, { size, color })
		return true
	}

	public addContainer(width: number, height: number, flexibleSize?: boolean) {
		if (!this.checkCreateRow(width, height)) {
			return
		}
		const container = this.currentRow.addStack()
		if (!flexibleSize) {
			container.size = new Size(width, height)
		}
		return container
	}

	public finish() {
		const totalWidth = this.maxWidth + this.padding * 2
		const totalHeight = this.previousTotalHeight + this.currentRowHeight + this.padding * 2
		this.container.size = new Size(totalWidth, totalHeight)

		return {
			resultingWidth: this.maxWidth * 2 * this.padding,
			resultingHeight: totalHeight,
		}
	}
}

//#endregion

//#region Widget Size

interface HomescreenWidgetSizes {
	small: Size
	medium: Size
	large: Size
	extraLarge?: Size
}

type WidgetSizesList = Map<string, HomescreenWidgetSizes>

function getWidgetSizes() {
	const phoneSizes: WidgetSizesList = new Map([
		['428x926', { small: new Size(170, 170), medium: new Size(364, 170), large: new Size(364, 382) }],
		['414x896', { small: new Size(169, 169), medium: new Size(360, 169), large: new Size(360, 379) }],
		['414x736', { small: new Size(159, 159), medium: new Size(348, 157), large: new Size(348, 357) }],
		['390x844', { small: new Size(158, 158), medium: new Size(338, 158), large: new Size(338, 354) }],
		['375x812', { small: new Size(155, 155), medium: new Size(329, 155), large: new Size(329, 345) }],
		['375x667', { small: new Size(148, 148), medium: new Size(321, 148), large: new Size(321, 324) }],
		['360x780', { small: new Size(155, 155), medium: new Size(329, 155), large: new Size(329, 345) }],
		['320x568', { small: new Size(141, 141), medium: new Size(292, 141), large: new Size(292, 311) }],
	])

	const padSizes: WidgetSizesList = new Map([
		[
			'768x1024',
			{
				small: new Size(141, 141),
				medium: new Size(305.5, 141),
				large: new Size(305.5, 305.5),
				extraLarge: new Size(634.5, 305.5),
			},
		],
		[
			'744x1133',
			{
				small: new Size(141, 141),
				medium: new Size(305.5, 141),
				large: new Size(305.5, 305.5),
				extraLarge: new Size(634.5, 305.5),
			},
		],
		[
			'810x1080',
			{
				small: new Size(146, 146),
				medium: new Size(320.5, 146),
				large: new Size(320.5, 320.5),
				extraLarge: new Size(669, 320.5),
			},
		],
		[
			'820x1180',
			{
				small: new Size(155, 155),
				medium: new Size(342, 155),
				large: new Size(342, 342),
				extraLarge: new Size(715.5, 342),
			},
		],
		[
			'834x1112',
			{
				small: new Size(150, 150),
				medium: new Size(327.5, 150),
				large: new Size(327.5, 327.5),
				extraLarge: new Size(682, 327.5),
			},
		],
		[
			'834x1194',
			{
				small: new Size(155, 155),
				medium: new Size(342, 155),
				large: new Size(342, 342),
				extraLarge: new Size(715.5, 342),
			},
		],
		[
			'954x1373',
			{
				small: new Size(162, 162),
				medium: new Size(350, 162),
				large: new Size(350, 350),
				extraLarge: new Size(726, 350),
			},
		],
		[
			'970x1389',
			{
				small: new Size(162, 162),
				medium: new Size(350, 162),
				large: new Size(350, 350),
				extraLarge: new Size(726, 350),
			},
		],
		[
			'1024x1366',
			{
				small: new Size(170, 170),
				medium: new Size(378.5, 170),
				large: new Size(378.5, 378.5),
				extraLarge: new Size(795, 378.5),
			},
		],
		[
			'1192x1590',
			{
				small: new Size(188, 188),
				medium: new Size(412, 188),
				large: new Size(412, 412),
				extraLarge: new Size(860, 412),
			},
		],
	])

	const deviceSize = Device.screenSize()
	const deviceSizeString = `${deviceSize.width}x${deviceSize.height}`
	// for rotated devices, the width and height are swapped
	const alternativeDeviceSizeString = `${deviceSize.height}x${deviceSize.width}`
	console.log(`Device size: ${deviceSizeString}`)

	const isPad = Device.isPad()
	console.log(`Device isPad: ${isPad}`)

	if (isPad) {
		const size = padSizes.get(deviceSizeString) ?? padSizes.get(alternativeDeviceSizeString)
		if (size) {
			console.log(`Widget sizes for pad with size ${deviceSize}: ${JSON.stringify(size)}`)
			return size
		}
	} else {
		const size = phoneSizes.get(deviceSizeString) ?? phoneSizes.get(alternativeDeviceSizeString)
		if (size) {
			console.log(`Widget sizes for phone with size ${deviceSize}: ${JSON.stringify(size)}`)
			return size
		}
	}

	console.log(`Could not find widget sizes for device with size ${deviceSize}`)

	return {
		small: new Size(0, 0),
		medium: new Size(0, 0),
		large: new Size(0, 0),
		extraLarge: new Size(0, 0),
	}
}

/**
 * Returns the widget size for the current widget family and device.
 */
function getWidgetSize(widgetSizes: HomescreenWidgetSizes, widgetFamily?: typeof config.widgetFamily): Size {
	// return a placeholder if the widget size is not defined
	if (widgetSizes === undefined) {
		return new Size(0, 0)
	}

	// return small widget size if the widget family is not set
	if (!widgetFamily) {
		console.log(`Defaulting to ${PREVIEW_WIDGET_SIZE} widget size`)
		return widgetSizes[PREVIEW_WIDGET_SIZE]
	}

	if (isHomescreenWidgetSize(widgetFamily, widgetSizes)) {
		return widgetSizes[widgetFamily] ?? new Size(0, 0)
	}

	return new Size(0, 0)
}

function isHomescreenWidgetSize(k: string, widgetSizes: HomescreenWidgetSizes): k is keyof typeof widgetSizes {
	return k in widgetSizes
}

//#endregion

//#region Widget Helpers

/**
 * Applies the custom lesson config to a timetable.
 **/
function applyLessonConfigs(timetable: TransformedLessonWeek, config: Config) {
	// iterate over the days, then the lessons
	for (const key of Object.keys(timetable)) {
		const day = timetable[key]
		for (const lesson of day) {
			// apply the lesson config
			applyCustomLessonConfig(lesson, config)
		}
	}
}

/**
 * Applies the custom lesson config to a lesson.
 */
function applyCustomLessonConfig(lesson: TransformedLesson, config: Config) {
	lesson.backgroundColor = unparsedColors.background.primary

	// return default values if there is no custom config
	if (!lesson.subject || !config.lessonOptions[lesson.subject?.name]) {
		return
	}

	const customOption = config.lessonOptions[lesson.subject?.name]
	let unwrappedCustomOption: SingleLessonOption | undefined

	// unwrap the option, as there can be teacher specific options
	if (Array.isArray(customOption)) {
		unwrappedCustomOption = customOption.find((option) => {
			return lesson.teachers.some((teacher) => teacher.name === option.teacher)
		})
	} else {
		unwrappedCustomOption = customOption
	}

	if (!unwrappedCustomOption) {
		return
	}

	// apply the custom color
	if (unwrappedCustomOption.ignoreInfo?.includes(lesson.info ?? '')) lesson.info = ''
	if (unwrappedCustomOption.ignoreInfo?.includes(lesson.note ?? '')) lesson.note = ''
	if (unwrappedCustomOption.ignoreInfo?.includes(lesson.text ?? '')) lesson.text = ''
	if (unwrappedCustomOption.subjectOverride) lesson.subject.name = unwrappedCustomOption.subjectOverride
	if (unwrappedCustomOption.longNameOverride) lesson.subject.longName = unwrappedCustomOption.longNameOverride
	if (unwrappedCustomOption.color) lesson.backgroundColor = unwrappedCustomOption.color
}

/**
 * Find out when to refresh the widget based on the content.
 */
function getRefreshDateForLessons(
	lessonsTodayRemaining: TransformedLesson[],
	lessonsTomorrow: TransformedLesson[],
	config: Config
) {
	let nextRefreshDate: Date

	// set the widget refresh time to the end of the current lesson, or the next lesson if there is only a short break
	if (lessonsTodayRemaining.length >= 1) {
		const firstLesson = lessonsTodayRemaining[0]
		const secondLesson = lessonsTodayRemaining[1]

		// if the next lesson has not started yet
		if (firstLesson.from > CURRENT_DATETIME) {
			nextRefreshDate = firstLesson.from
			console.log(
				`Would refresh at the start of the next lesson at ${nextRefreshDate}, as it has not started yet`
			)
		} else {
			// if the break is too short
			if (
				secondLesson &&
				secondLesson.from.getTime() - firstLesson.to.getTime() < config.config.breakMaxMinutes * 60 * 1000
			) {
				nextRefreshDate = secondLesson.from
				console.log(
					`Would refresh at the start of the next lesson at ${nextRefreshDate}, as the break is too short.`
				)
			} else {
				nextRefreshDate = firstLesson.to
				console.log(
					`Would refresh at the end of the current lesson at ${nextRefreshDate}, as there is a long enough break.`
				)
			}
		}
	} else {
		let shouldLazyUpdate = true

		// if the next lesson (on the next day) is in the scope of the frequent updates
		if (lessonsTomorrow && lessonsTomorrow.length > 1) {
			const timeUntilNextLesson = lessonsTomorrow[0].from.getTime() - CURRENT_DATETIME.getTime()
			shouldLazyUpdate = timeUntilNextLesson > config.config.refreshing.normalScopeHours * 60 * 60 * 1000
		}

		// refresh based on normal/lazy refreshing
		if (shouldLazyUpdate) {
			console.log(`Would refresh in ${config.config.refreshing.lazyIntervalMinutes} minutes (lazy updating).`)
			nextRefreshDate = new Date(
				CURRENT_DATETIME.getTime() + config.config.refreshing.lazyIntervalMinutes * 60 * 1000
			)
		} else {
			console.log(`Would refresh in ${config.config.refreshing.normalIntervalMinutes} minutes (normal updating).`)
			nextRefreshDate = new Date(
				CURRENT_DATETIME.getTime() + config.config.refreshing.normalIntervalMinutes * 60 * 1000
			)
		}
	}

	return nextRefreshDate
}

/**
 * Compares two lessons and returns if they can be combined.
 * If ignoreDetails is true, only subject name and time will be compared.
 * @param ignoreDetails if the comparison should only consider subject and time
 */
function shouldCombineLessons(
	a: TransformedLesson,
	b: TransformedLesson,
	config: Config,
	ignoreDetails = false,
	ignoreBreaks = false
) {
	if (a.subject?.name !== b.subject?.name) return false
	if (!ignoreBreaks && b.from.getTime() - a.to.getTime() > config.config.breakMinMinutes * 60 * 1000) return false

	if (ignoreDetails) return true

	// check if the lessons are equal, ignoring the duration and time (as those are changed when combining)
	const ignoredEqualKeys = ['duration', 'break', 'to', 'from', 'id']
	const keyIgnorer = (key: string, value: any) => (ignoredEqualKeys.includes(key) ? undefined : value)
	return JSON.stringify(a, keyIgnorer) === JSON.stringify(b, keyIgnorer)
}

//#endregion

//#region Helpers

function asNumericTime(date: Date) {
	return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

function asWeekday(date: Date) {
	return date.toLocaleDateString(LOCALE, { weekday: 'long' })
}

/**
 * Returns a title for a subject following an order based on what is available.
 */
function getSubjectTitle(lesson: TransformedLesson, useLongName = false) {
	if (useLongName && lesson.subject?.longName) return lesson.subject.longName
	if (lesson.subject?.name) return lesson.subject.name
	if (lesson.info && lesson.info.length > 0) return lesson.info
	if (lesson.text && lesson.text.length > 0) return lesson.text
	if (lesson.teachers.length > 0) return lesson.teachers[0].name
	return '?'
}

function sortKeysByDate(timetable: TransformedLessonWeek) {
	const keys = Object.keys(timetable)
	return keys.sort((a, b) => {
		return new Date(a).getTime() - new Date(b).getTime()
	})
}

function getCharHeight(size: number) {
	return size * 1.2
}

function getCharWidth(size: number) {
	return size * 0.75
}

function getTextWidth(text: string, fontSize: number) {
	const charWidth = getCharWidth(fontSize)
	// count the number of really narrow characters
	let reallyNarrowCharCount = text.match(/[\|I\.,:; ]/g)?.length ?? 0
	// count the number of narrow characters
	let narrowCharCount = text.match(/[1iljtr]/g)?.length ?? 0
	// count the number of wide characters
	let wideCharCount = text.match(/[wmWM]/g)?.length ?? 0

	let normalCharCount = text.length - reallyNarrowCharCount - narrowCharCount - wideCharCount

	// approximate the width of the text
	return charWidth * (normalCharCount + reallyNarrowCharCount * 0.4 + narrowCharCount * 0.75 + wideCharCount * 1.25)
}

function asMilliseconds(duration: number, unit: 'seconds' | 'minutes' | 'hours' | 'days') {
	switch (unit) {
		case 'seconds':
			return duration * 1000
		case 'minutes':
			return duration * 60 * 1000
		case 'hours':
			return duration * 60 * 60 * 1000
		case 'days':
			return duration * 24 * 60 * 60 * 1000
	}
}

/**
 * Schedules a notification with the given parameters.
 * @param title 
 * @param body 
 * @param sound the sound to play, defaults to 'event'
 * @param date the date to schedule the notification for, defaults to 5 seconds from now
 */
function scheduleNotification(
	title: string,
	body?: string,
	sound?:
		| 'default'
		| 'accept'
		| 'alert'
		| 'complete'
		| 'event'
		| 'failure'
		| 'piano_error'
		| 'piano_success'
		| 'popup',
	date = new Date(Date.now() + 5000)
) {
	const notification = new Notification()

	notification.title = title
	notification.body = body
	notification.sound = sound ?? 'event'

	notification.threadIdentifier = 'untis'
	notification.deliveryDate = date

	notification.schedule()
}

//#endregion

//#endregion

//#region Layout

const viewNames = ['lessons', 'preview', 'exams', 'grades', 'absences', 'roles'] as const
type ViewName = typeof viewNames[number]

function parseLayoutString(layoutString: string) {
	let layout: ViewName[][] = []
	for (const column of layoutString.split('|')) {
		let columnViews: ViewName[] = []
		for (const view of column.split(',')) {
			if (viewNames.includes(view as ViewName)) {
				columnViews.push(view as ViewName)
			} else {
				console.warn(`⚠️ Invalid view name: ${view}`)
			}
		}
		layout.push(columnViews)
	}

	return layout
}

/**
 * Adapts the number of columns in the layout to the widget size.
 */
function adaptLayoutForSize(layout: ViewName[][]) {
	switch (config.widgetFamily) {
		case 'small':
			return layout.slice(0, 1)
		case 'medium':
		case 'large':
			return layout.slice(0, 2)
		default:
			return layout
	}
}

const layoutString = args.widgetParameter ?? defaultLayout
console.log(layoutString)
const layout = adaptLayoutForSize(parseLayoutString(layoutString))
console.log(layout)

//#endregion

//#region Errors

type IErrorCodes = {
	[Property in ErrorCodes]: IErrorCode
}
interface IErrorCode {
	title: string
	description?: string
	icon?: string
}

type ErrorCodes =
	| 'NO_INTERNET'
	| 'NO_COOKIES'
	| 'LOGIN_ERROR'
	| 'NO_TOKEN'
	| 'NO_USER'
	| 'NOT_FOUND'
	| 'INVALID_WEBUNTIS_URL'
	| 'INPUT_CANCELLED'
	| 'SELECTION_CANCELLED'

const ErrorCode: IErrorCodes = {
	NO_INTERNET: { title: 'The internet connection appears to be offline.', icon: 'wifi.exclamationmark' },
	NO_COOKIES: { title: 'Could not get cookies.', description: 'Please check your credentials!', icon: 'key' },
	LOGIN_ERROR: { title: 'Could not login.', description: 'Please check your credentials!', icon: 'lock.circle' },
	NO_TOKEN: { title: 'Could not get token.', description: 'Please check your credentials!', icon: 'key' },
	NO_USER: {
		title: 'Could not get user.',
		description: 'Please check your credentials!',
		icon: 'person.fill.questionmark',
	},
	NOT_FOUND: { title: 'Got 404 Error.', description: 'WebUntis seems to be offline...', icon: 'magnifyingglass' },
	INVALID_WEBUNTIS_URL: {
		title: 'Invalid WebUntis URL',
		description: 'Please check your WebUntis URL!',
		icon: 'link',
	},
	INPUT_CANCELLED: { title: 'Input cancelled', description: 'Please try again!', icon: 'xmark.octagon' },
	SELECTION_CANCELLED: { title: 'Selection cancelled', description: 'Please try again!', icon: 'xmark.octagon' },
}

const ScriptableErrors = {
	NO_INTERNET: 'The internet connection appears to be offline.',
}

interface ExtendedError extends Error {
	icon?: string
}

/**
 * Creates an error from the given code.
 * @param errorCode
 * @returns an Error to be thrown
 */
function createError(errorCode: IErrorCode) {
	const error = new Error() as ExtendedError
	error.name = errorCode.title
	if (errorCode.description) {
		error.message = errorCode.description
	}
	if (errorCode.icon) {
		error.icon = errorCode.icon
	}
	return error
}

function throwError(errorCode: IErrorCode) {
	throw createError(errorCode)
}

function createErrorWidget(title: string, description: string, icon?: string) {
	const widget = new ListWidget()
	widget.backgroundColor = Color.black()

	const content = widget.addStack()
	content.layoutVertically()
	content.centerAlignContent()

	if (icon) {
		addSymbol(icon, content, { color: colors.text.red, size: 40 })
		content.addSpacer(8)
	}

	const errorTitle = widget.addText(title)
	errorTitle.font = Font.mediumSystemFont(18)
	errorTitle.textColor = colors.text.red

	if (description !== '') {
		const errorDescription = widget.addText(description)
		errorDescription.font = Font.regularSystemFont(14)
		errorDescription.textColor = colors.text.red
	}

	return widget
}

//#endregion

//#region Setup

const keychainRequestStrings = {
	school: {
		title: 'WebUntis School & Server',
		description:
			'Please visit https://webuntis.com/ and select your school. Then paste the url you were redirected to here.',
		placeholder: 'https://server.webuntis.com/WebUntis/?school=schoolname',
	},
	username: {
		title: 'WebUntis Username',
		description: 'The username you use to login to WebUntis.',
		placeholder: 'username',
	},
	password: {
		title: 'WebUntis Password',
		description: 'The password you use to login to WebUntis. It will be stored in your keychain.',
		placeholder: 'password',
	},
}

type AvailableKeychainEntries = keyof typeof keychainRequestStrings | 'server'

const usernamePlaceholders: Record<string, string> = {
	litec: '401467',
}

async function readKeychain(requestMissing: boolean = false) {
	if (requestMissing) {
		const server = await getFromKeychain('server')
		const school = await getFromKeychain('school')
		const username = await getFromKeychain('username', usernamePlaceholders[school ?? ''] ?? '')
		const password = await getFromKeychain('password')

		return { server, school, username, password }
	} else {
		return {
			server: Keychain.get('webuntis-server'),
			school: Keychain.get('webuntis-school'),
			username: Keychain.get('webuntis-username'),
			password: Keychain.get('webuntis-password'),
		}
	}
}

async function writeKeychain() {
	const initialUser = await readKeychain(false)

	await requestKeychainEntry('school', initialUser.school)
	await requestKeychainEntry('username', initialUser.username ?? usernamePlaceholders[initialUser.school ?? ''] ?? '')
	await requestKeychainEntry('password')
}

async function getFromKeychain(key: AvailableKeychainEntries, defaultValue: string = '') {
	const keychainKey = `webuntis-${key}`
	if (Keychain.contains(keychainKey)) {
		return Keychain.get(keychainKey)
	} else {
		return requestKeychainEntry(key, defaultValue)
	}
}

async function requestKeychainEntry(key: AvailableKeychainEntries, defaultValue = '') {
	switch (key) {
		case 'school':
		case 'server':
			const webuntisUrl = await askForInput({ ...keychainRequestStrings['school'], defaultValue })
			// get the server and school from the input
			const regex = /https:\/\/(.+?)\.webuntis\.com\/WebUntis\/\?school=(\w+).*/
			const match = webuntisUrl.match(regex)
			if (match) {
				const [, server, school] = match
				Keychain.set('webuntis-server', server)
				Keychain.set('webuntis-school', school)
				return school
			}
			throw createError(ErrorCode.INVALID_WEBUNTIS_URL)
		case 'username':
		case 'password':
			const input = await askForInput({ ...keychainRequestStrings[key], defaultValue })
			Keychain.set(`webuntis-${key}`, input)
			return input
	}
}

async function askForInput(options: {
	title: string
	description: string
	placeholder: string
	defaultValue: string
	isSecure?: boolean
}): Promise<string> {
	let alert = new Alert()
	alert.title = options.title
	alert.message = options.description

	const textField = alert.addTextField(options.placeholder, options.defaultValue)
	textField.isSecure = options.isSecure ?? false

	alert.addAction('OK')
	alert.addCancelAction('Cancel')

	const responseIndex = await alert.presentAlert()

	if (responseIndex === 0) {
		return alert.textFieldValue(0)
	} else {
		throw createError(ErrorCode.INPUT_CANCELLED)
	}
}

async function selectOption(
	availableOptions: string[],
	options: {
		title?: string
		description?: string
	}
): Promise<string> {
	let alert = new Alert()

	alert.title = options.title ?? 'Select an Option'
	alert.message = options.description ?? 'Choose one of the following options:'

	for (let option of availableOptions) {
		alert.addAction(option)
	}

	alert.addCancelAction('Cancel')

	const responseIndex = await alert.presentSheet()

	if (responseIndex === -1) {
		throw createError(ErrorCode.SELECTION_CANCELLED)
	}

	return availableOptions[responseIndex]
}

//#endregion

//#region Widget

interface FetchedData {
	lessonsTodayRemaining?: TransformedLesson[]
	lessonsNextDay?: TransformedLesson[]
	nextDayKey?: string
	exams?: TransformedExam[]
	grades?: TransformedGrade[]
	absences?: TransformedAbsence[]
	classRoles?: TransformedClassRole[]
	refreshDate?: Date
}

function checkNewRefreshDate(newDate: Date, fetchedData: FetchedData) {
	if (!fetchedData.refreshDate || newDate < fetchedData.refreshDate) {
		fetchedData.refreshDate = newDate
		return
	}
}

type FetchableNames = 'timetable' | 'exams' | 'grades' | 'absences' | 'roles'

/**
 * Fetches the data which is required for the given views.
 */
async function fetchDataForViews(viewNames: ViewName[], user: FullUser, options: Options) {
	const fetchedData: FetchedData = {}
	const itemsToFetch = new Set<FetchableNames>()

	for (const viewName of viewNames) {
		switch (viewName) {
			case 'lessons':
			case 'preview':
				itemsToFetch.add('timetable')
				break
			case 'exams':
				itemsToFetch.add('exams')
				break
			case 'grades':
				itemsToFetch.add('grades')
				break
			case 'absences':
				itemsToFetch.add('absences')
				break
			case 'roles':
				itemsToFetch.add('roles')
				break
		}
	}

	const fetchPromises: Promise<any>[] = []

	if (itemsToFetch.has('timetable')) {
		const promise = getTimetable(user, options).then(({ lessonsTodayRemaining, lessonsNextDay, nextDayKey }) => {
			fetchedData.lessonsTodayRemaining = lessonsTodayRemaining
			fetchedData.lessonsNextDay = lessonsNextDay
			fetchedData.nextDayKey = nextDayKey
			checkNewRefreshDate(getRefreshDateForLessons(lessonsTodayRemaining, lessonsNextDay, options), fetchedData)
		})
		fetchPromises.push(promise)
	}

	if (itemsToFetch.has('exams')) {
		const examsFrom = new Date(new Date().getTime() + options.views.exams.scopeDays * 24 * 60 * 60 * 1000)
		const promise = getExamsFor(user, examsFrom, CURRENT_DATETIME, options).then((exams) => {
			fetchedData.exams = exams
		})
		const refreshDate = new Date(Date.now() + (options.config.cacheHours.exams * 60 * 60 * 1000) / 2)
		checkNewRefreshDate(refreshDate, fetchedData)
		fetchPromises.push(promise)
	}

	if (itemsToFetch.has('grades')) {
		const gradesFrom = new Date(CURRENT_DATETIME.getTime() - options.views.grades.scopeDays * 24 * 60 * 60 * 1000)
		const promise = getGradesFor(user, gradesFrom, CURRENT_DATETIME, options).then((grades) => {
			fetchedData.grades = grades
		})
		const refreshDate = new Date(Date.now() + (options.config.cacheHours.grades * 60 * 60 * 1000) / 2)
		checkNewRefreshDate(refreshDate, fetchedData)
		fetchPromises.push(promise)
	}

	if (itemsToFetch.has('absences')) {
		const schoolYears = await getSchoolYears(user, options)
		// get the current school year
		const currentSchoolYear = schoolYears.find(
			(schoolYear) => schoolYear.from <= CURRENT_DATETIME && schoolYear.to >= CURRENT_DATETIME
		)
		const promise = getAbsencesFor(user, currentSchoolYear.from, CURRENT_DATETIME, options).then((absences) => {
			fetchedData.absences = absences
		})
		const refreshDate = new Date(Date.now() + (options.config.cacheHours.absences * 60 * 60 * 1000) / 2)
		checkNewRefreshDate(refreshDate, fetchedData)
		fetchPromises.push(promise)
	}

	if (itemsToFetch.has('roles')) {
		const promise = fetchClassRolesFor(user, CURRENT_DATETIME, CURRENT_DATETIME).then((roles) => {
			fetchedData.classRoles = roles
		})
		// tomorrow midnight
		const refreshDate = new Date(new Date().setHours(24, 0, 0, 0))
		checkNewRefreshDate(refreshDate, fetchedData)
		fetchPromises.push(promise)
	}

	await Promise.all(fetchPromises)

	return fetchedData
}

interface ViewBuildData {
	container: WidgetStack
	width: number
	height: number
}

/**
 * Creates the widget by adding as many views to it as fit.
 * Also adds the footer.
 */
async function createWidget(user: FullUser, layout: ViewName[][], options: Options) {
	const widget = new ListWidget()

	const widgetSizes = getWidgetSizes()

	const paddingHorizontal = Math.max(options.appearance.padding, 4)
	const paddingVertical = Math.max(options.appearance.padding, 6)

	const widgetSize = getWidgetSize(widgetSizes, config.widgetFamily)
	const contentSize = new Size(widgetSize.width - paddingHorizontal * 2, widgetSize.height - paddingVertical * 2)

	widget.setPadding(paddingHorizontal, paddingVertical, paddingHorizontal, paddingVertical)
	widget.backgroundColor = Color.black()

	const widgetContent = widget.addStack()
	widgetContent.layoutHorizontally()
	// widgetContent.layoutVertically()
	widgetContent.topAlignContent()
	widgetContent.spacing = options.appearance.spacing

	// make a list of the shown views
	const shownViews = new Set<ViewName>()
	for (const row of layout) {
		for (const view of row) {
			shownViews.add(view)
		}
	}

	// fetch the data for the shown views
	const fetchedData = await fetchDataForViews(Array.from(shownViews), user, options)

	if (fetchedData.refreshDate) {
		console.log(`Refresh date: ${fetchedData.refreshDate}`)
		widget.refreshAfterDate = fetchedData.refreshDate
	}

	// TODO: flexible layout when only one column
	const columnWidth = contentSize.width / layout.length

	// add all the columns with the views
	for (const column of layout) {
		// add the column
		const columnStack = widgetContent.addStack()
		columnStack.layoutVertically()
		columnStack.topAlignContent()
		columnStack.spacing = options.appearance.spacing

		// calculate the real available height
		let availableContentHeight = contentSize.height
		if (options.footer.show) availableContentHeight -= getFooterHeight(options)

		columnStack.size = new Size(columnWidth, availableContentHeight)

		let remainingHeight = availableContentHeight

		console.log(`Column has ${availableContentHeight} available height`)

		for (const view of column) {
			// exit if there is not enough space left
			if (remainingHeight <= getCharHeight(options.appearance.fontSize)) continue

			const viewData: ViewBuildData = {
				container: columnStack,
				width: columnWidth,
				height: remainingHeight,
			}

			let viewHeight = 0

			switch (view) {
				case 'lessons':
					if (!fetchedData.lessonsTodayRemaining || !fetchedData.lessonsNextDay || !fetchedData.nextDayKey) {
						console.warn(`Tried to add lessons view, but no lessons data was fetched`)
						continue
					}
					// show a preview if there are no lessons today anymore
					if (fetchedData.lessonsTodayRemaining.length > 0) {
						viewHeight = addViewLessons(
							fetchedData.lessonsTodayRemaining,
							options.views.lessons.maxCount,
							viewData,
							options
						)
					} else {
						viewHeight = addViewPreview(
							fetchedData.lessonsNextDay,
							fetchedData.nextDayKey,
							viewData,
							options
						)
					}
					break
				case 'preview':
					if (!fetchedData.lessonsNextDay || !fetchedData.nextDayKey) {
						console.warn(`Tried to add preview view, but no lessons data was fetched`)
						continue
					}
					// only show the day preview, if it is not already shown
					if (shownViews.has('lessons') && fetchedData.lessonsTodayRemaining?.length === 0) break

					viewHeight = addViewPreview(fetchedData.lessonsNextDay, fetchedData.nextDayKey, viewData, options)
					break
				case 'exams':
					if (!fetchedData.exams) {
						console.warn(`Tried to add exams view, but no exams data was fetched`)
						continue
					}
					viewHeight = addViewExams(fetchedData.exams, options.views.exams.maxCount, viewData, options)
					break
				case 'grades':
					if (!fetchedData.grades) {
						console.warn(`Tried to add grades view, but no grades data was fetched`)
						continue
					}
					viewHeight = addViewGrades(fetchedData.grades, options.views.grades.maxCount, viewData, options)
					break
				case 'absences':
					if (!fetchedData.absences) {
						console.warn(`Tried to add absences view, but no absences data was fetched`)
						continue
					}
					viewHeight = addViewAbsences(
						fetchedData.absences,
						options.views.absences.maxCount,
						viewData,
						options
					)
					break
			}

			// add the spacing if necessary (view added and enough space left)
			if (viewHeight > 0 && remainingHeight > options.appearance.spacing) {
				remainingHeight -= options.appearance.spacing
			}

			remainingHeight -= viewHeight

			console.log(`Added view ${view} with height ${viewHeight}, remaining height: ${remainingHeight}`)
		}

		if (remainingHeight > options.appearance.spacing) {
			// add spacer to fill the remaining space
			let space = remainingHeight - options.appearance.spacing
			if (space < 0) space = 0
			columnStack.addSpacer(space)
		}
	}

	if (options.footer.show) {
		addFooter(widget, contentSize.width, options)
	}

	return widget
}

function getFooterHeight(config: Config) {
	return getCharHeight(10) + 2 * 4
}

function addFooter(container: WidgetStack | ListWidget, width: number, config: Config) {
	const footerGroup = container.addStack()

	footerGroup.layoutHorizontally()
	footerGroup.spacing = 4
	footerGroup.bottomAlignContent()
	footerGroup.centerAlignContent()
	// avoid overflow when pushed to the bottom
	footerGroup.setPadding(4, 6, 4, 6)
	footerGroup.size = new Size(width, getFooterHeight(config))

	addSymbol('arrow.clockwise', footerGroup, {
		color: usingOldCache ? colors.text.red : colors.text.secondary,
		size: 10,
		outerSize: 10,
	})

	// show the time of the last update (now) as HH:MM with leading zeros
	const updateDateTime = footerGroup.addText(
		`${new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`
	)
	updateDateTime.textColor = usingOldCache ? colors.text.red : colors.text.secondary
	updateDateTime.font = Font.regularSystemFont(10)

	if (usingOldCache) {
		const updateInfo = footerGroup.addText(' (cache)')
		updateInfo.textColor = colors.text.red
		updateInfo.font = Font.regularSystemFont(10)
	}

	footerGroup.addSpacer()

	// TODO: make more exact
	const executionDuration = `${new Date().getTime() - scriptStartDatetime.getTime()}ms`
	const executionDurationText = footerGroup.addText(executionDuration)
	executionDurationText.textColor = colors.text.secondary
	executionDurationText.font = Font.regularSystemFont(10)
}

//#endregion

//#region Script

async function setupAndCreateWidget() {
	const { useICloud, documentsDirectory } = getFileManagerOptions()
	const untisConfig = await readConfig(documentsDirectory, useICloud)
	const options: Options = { ...untisConfig, documentsDirectory, useICloud }
	const user = await prepareUser(options)
	const widget = await createWidget(user, layout, options)
	return widget
}

enum ScriptActions {
	VIEW = '💻 Show Widget',
	CHANGE_CREDENTIALS = '🔑 Change Credentials',
	CLEAR_CACHE = '🗑️ Clear Cache',
}

async function runInteractive() {
	const actions = Object.values(ScriptActions).filter((item) => {
		return isNaN(Number(item))
	})

	const input = await selectOption(actions, {
		title: 'What do you want to do?',
	})

	switch (input) {
		case ScriptActions.VIEW:
			const widget = await setupAndCreateWidget()
			switch (PREVIEW_WIDGET_SIZE) {
				case 'small':
					widget.presentSmall()
					break
				case 'medium':
					widget.presentMedium()
					break
				case 'large':
					widget.presentLarge()
					break
			}
			break
		case ScriptActions.CHANGE_CREDENTIALS:
			await writeKeychain()
			break
		case ScriptActions.CLEAR_CACHE:
			await clearCache()
	}
}

async function run() {
	try {
		if (config.runsInWidget) {
			const widget = await setupAndCreateWidget()
			Script.setWidget(widget)
		} else {
			await runInteractive()
		}
	} catch (error) {
		let widget: ListWidget
		const castedError = error as Error

		if (castedError.message.toLowerCase() == ScriptableErrors.NO_INTERNET.toLowerCase()) {
			widget = createErrorWidget('The internet connection seems to be offline!', '', 'wifi.exclamationmark')
		} else {
			const extendedError = error as ExtendedError
			console.log(extendedError.stack)
			console.log(extendedError.cause as string)
			widget = createErrorWidget(extendedError.name, extendedError.message, extendedError.icon)
		}

		if (!config.runsInWidget) {
			widget.presentLarge()
		}

		Script.setWidget(widget)
	}
}

const scriptStartDatetime = new Date()

// the await is required, but top-level await cannot be used with module.exports
// @ts-ignore
await run()

console.log(`Script finished in ${new Date().getTime() - scriptStartDatetime.getTime()}ms.`)

Script.complete()

module.exports = {}
//#endregion
