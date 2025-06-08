use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub enum BorderStyle {
    Thin,
    Medium,
    Thick,
    Double,
    Dotted,
    SlantDashDot,
    MediumDashed,
    MediumDashDotDot,
    MediumDashDot,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub enum BorderType {
    All,
    Inner,
    Outer,
    Top,
    Right,
    Bottom,
    Left,
    CenterH,
    CenterV,
    None,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct BorderOptions {
    color: String,
    style: BorderStyle,
    border: BorderType,
}

#[wasm_bindgen]
impl BorderOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(color: String, style: BorderStyle, border: BorderType) -> BorderOptions {
        BorderOptions {
            color,
            style,
            border,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn color(&self) -> String {
        self.color.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_color(&mut self, color: String) {
        self.color = color;
    }

    #[wasm_bindgen(getter)]
    pub fn style(&self) -> BorderStyle {
        self.style.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_style(&mut self, style: BorderStyle) {
        self.style = style;
    }

    #[wasm_bindgen(getter)]
    pub fn border(&self) -> BorderType {
        self.border.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_border(&mut self, border: BorderType) {
        self.border = border;
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub enum HorizontalAlignment {
    Left,
    Center,
    Right,
    General,
    CenterContinuous,
    Distributed,
    Fill,
    Justify,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub enum VerticalAlignment {
    Bottom,
    Center,
    Distributed,
    Justify,
    Top,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct WorksheetProperties {
    name: String,
    color: String,
    sheet_id: u32,
    state: String,
}

#[wasm_bindgen]
impl WorksheetProperties {
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_name(&mut self, name: String) {
        self.name = name;
    }

    #[wasm_bindgen(getter)]
    pub fn color(&self) -> String {
        self.color.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_color(&mut self, color: String) {
        self.color = color;
    }

    #[wasm_bindgen(getter)]
    pub fn sheet_id(&self) -> u32 {
        self.sheet_id
    }

    #[wasm_bindgen(setter)]
    pub fn set_sheet_id(&mut self, sheet_id: u32) {
        self.sheet_id = sheet_id;
    }

    #[wasm_bindgen(getter)]
    pub fn state(&self) -> String {
        self.state.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_state(&mut self, state: String) {
        self.state = state;
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct DefinedName {
    name: String,
    scope: Option<u32>,
    formula: String,
}

#[wasm_bindgen]
impl DefinedName {
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.name.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_name(&mut self, name: String) {
        self.name = name;
    }

    #[wasm_bindgen(getter)]
    pub fn scope(&self) -> Option<u32> {
        self.scope
    }

    #[wasm_bindgen(setter)]
    pub fn set_scope(&mut self, scope: Option<u32>) {
        self.scope = scope;
    }

    #[wasm_bindgen(getter)]
    pub fn formula(&self) -> String {
        self.formula.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_formula(&mut self, formula: String) {
        self.formula = formula;
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Range {
    pub start_row: i32,
    pub start_column: i32,
    pub end_row: i32,
    pub end_column: i32,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct SelectedView {
    sheet: u32,
    row: i32,
    column: i32,
    range: Range,
    top_row: i32,
    left_column: i32,
}

#[wasm_bindgen]
impl SelectedView {
    #[wasm_bindgen(getter)]
    pub fn sheet(&self) -> u32 {
        self.sheet
    }

    #[wasm_bindgen(setter)]
    pub fn set_sheet(&mut self, sheet: u32) {
        self.sheet = sheet;
    }

    #[wasm_bindgen(getter)]
    pub fn row(&self) -> i32 {
        self.row
    }

    #[wasm_bindgen(setter)]
    pub fn set_row(&mut self, row: i32) {
        self.row = row;
    }

    #[wasm_bindgen(getter)]
    pub fn column(&self) -> i32 {
        self.column
    }

    #[wasm_bindgen(setter)]
    pub fn set_column(&mut self, column: i32) {
        self.column = column;
    }

    #[wasm_bindgen(getter)]
    pub fn range(&self) -> Range {
        self.range
    }

    #[wasm_bindgen(setter)]
    pub fn set_range(&mut self, range: Range) {
        self.range = range;
    }

    #[wasm_bindgen(getter)]
    pub fn top_row(&self) -> i32 {
        self.top_row
    }

    #[wasm_bindgen(setter)]
    pub fn set_top_row(&mut self, top_row: i32) {
        self.top_row = top_row;
    }

    #[wasm_bindgen(getter)]
    pub fn left_column(&self) -> i32 {
        self.left_column
    }

    #[wasm_bindgen(setter)]
    pub fn set_left_column(&mut self, left_column: i32) {
        self.left_column = left_column;
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct ClipboardCell {
    text: String,
    style: String,
}

#[wasm_bindgen]
impl ClipboardCell {
    #[wasm_bindgen(getter)]
    pub fn text(&self) -> String {
        self.text.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_text(&mut self, text: String) {
        self.text = text;
    }

    #[wasm_bindgen(getter)]
    pub fn style(&self) -> String {
        self.style.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_style(&mut self, style: String) {
        self.style = style;
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct CellStyle {
    read_only: bool,
    quote_prefix: bool,
    fill: String,
    font: String,
    border: String,
    num_fmt: String,
    alignment: Option<String>,
}

#[wasm_bindgen]
impl CellStyle {
    #[wasm_bindgen(getter)]
    pub fn read_only(&self) -> bool {
        self.read_only
    }

    #[wasm_bindgen(setter)]
    pub fn set_read_only(&mut self, read_only: bool) {
        self.read_only = read_only;
    }

    #[wasm_bindgen(getter)]
    pub fn quote_prefix(&self) -> bool {
        self.quote_prefix
    }

    #[wasm_bindgen(setter)]
    pub fn set_quote_prefix(&mut self, quote_prefix: bool) {
        self.quote_prefix = quote_prefix;
    }

    #[wasm_bindgen(getter)]
    pub fn fill(&self) -> String {
        self.fill.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_fill(&mut self, fill: String) {
        self.fill = fill;
    }

    #[wasm_bindgen(getter)]
    pub fn font(&self) -> String {
        self.font.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_font(&mut self, font: String) {
        self.font = font;
    }

    #[wasm_bindgen(getter)]
    pub fn border(&self) -> String {
        self.border.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_border(&mut self, border: String) {
        self.border = border;
    }

    #[wasm_bindgen(getter)]
    pub fn num_fmt(&self) -> String {
        self.num_fmt.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_num_fmt(&mut self, num_fmt: String) {
        self.num_fmt = num_fmt;
    }

    #[wasm_bindgen(getter)]
    pub fn alignment(&self) -> Option<String> {
        self.alignment.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_alignment(&mut self, alignment: Option<String>) {
        self.alignment = alignment;
    }
} 